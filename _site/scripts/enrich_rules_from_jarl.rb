#!/usr/bin/env ruby
require 'open-uri'
require 'yaml'

JARL_BASE = 'https://www.jarl.org'
MAIN_PAGE = 'https://www.jarl.org/Japanese/8_World/8-1_overseas/8-1_Overseas.htm'

def fetch(url)
  warn "fetching: #{url}"
  URI.open(url, open_timeout: 10, read_timeout: 10).read
rescue => e
  warn "fetch error #{url}: #{e.message}"
  nil
end

def find_country_link(main_html, country_names)
  country_names.each do |name|
    # look for an anchor that contains the country name
    if main_html =~ /<a[^>]+href=["']([^"']+)["'][^>]*>[^<]*#{Regexp.escape(name)}[^<]*<\//i
      return $1
    end
    # or when name appears in link text with spaces/newlines
    if main_html =~ /<a[^>]+href=["']([^"']+)["'][^>]*>[^<]*?#{Regexp.escape(name)}.*?<\//im
      return $1
    end
  end
  nil
end

def find_link_near_name(html, name, window=800)
  idx = html.index(name)
  return nil unless idx
  start_pos = [0, idx - window].max
  end_pos = [html.length - 1, idx + window].min
  slice = html[start_pos..end_pos]
  # find first href in slice
  if slice =~ /href=["']([^"']+)["']/i
    return $1
  end
  nil
end

def extract_detail_note(page_html)
  return nil unless page_html
  # Try to find sentences mentioning '申請' or numbers/days
  # Japanese patterns
  j_match = page_html.match(/([^。\n]{0,120}(申請不要|申請不要です|申請が不要|申請方法|申請|3か月|3ヶ月|90日|90日以内|申請が必要)[^。\n]{0,120})/m)
  return j_match[1].gsub(/<[^>]+>/, '').strip if j_match
  # English fallback: look for 'application' or 'no application' or '90 days' or '3 months'
  e_match = page_html.match(/([^\.\n]{0,200}(no application|required to apply|application|90 days|3 months|no prior application)[^\.\n]{0,200})/im)
  return e_match[1].gsub(/<[^>]+>/, '').strip if e_match
  nil
end

ROOT = File.expand_path('..', __dir__)
rules_file = File.join(ROOT, '_data', 'rules.yml')
unless File.exist?(rules_file)
  warn "rules file not found: #{rules_file}"
  exit 2
end

rules = YAML.load_file(rules_file)
main_html = fetch(MAIN_PAGE)
if main_html
  begin
    main_html = main_html.encode('UTF-8', invalid: :replace, undef: :replace, replace: '?')
  rescue
    main_html = main_html.force_encoding('UTF-8')
  end
else
  warn "no main page"
  exit 3
end

# collect candidate links from the main page for further inspection
candidate_links = main_html.scan(/href=["']([^"']+)["']/i).flatten.uniq
candidate_links.map! { |h| h.start_with?('http') ? h : (JARL_BASE + (h.start_with?('/') ? h : '/' + h)) }
candidate_links.uniq!

# helper: gather additional links recursively (depth-limited)
def gather_links_from(url, depth=1)
  return [] if depth < 0
  html = fetch(url)
  return [] unless html
  begin
    html = html.encode('UTF-8', invalid: :replace, undef: :replace, replace: '?')
  rescue
    html = html.force_encoding('UTF-8')
  end
  links = html.scan(/href=["']([^"']+)["']/i).flatten.map do |h|
    h = h.strip
    next nil if h.nil? || h.empty?
    if h.start_with?('http')
      h
    else
      JARL_BASE + (h.start_with?('/') ? h : '/' + h)
    end
  end.compact.uniq
  # filter to same site
  links.select! { |l| l.start_with?(JARL_BASE) }
  # depth recursion (shallow)
  if depth > 0
    sub = links.flat_map { |l| gather_links_from(l, depth - 1) }
    links += sub
  end
  links.uniq
end

warn "initially found #{candidate_links.size} raw links on main page"

candidate_links = candidate_links.select { |l| l.include?('/Japanese/') || l.include?('/English/') }
# expand with shallow crawl depth 1 for more candidates
expanded = candidate_links.flat_map { |l| gather_links_from(l, 1) }
candidate_links += expanded
candidate_links.uniq!
warn "expanded to #{candidate_links.size} candidate links to inspect after shallow crawl"

link_cache = {}

# fallback keyword -> target map for candidate filenames
keyword_map = {
  'korea' => 'korea',
  'Korea' => 'korea',
  'America' => 'united_states',
  'USA' => 'united_states',
  'United' => 'united_states',
  'France' => 'france',
  'Australia' => 'australia',
  'NewZealand' => 'new_zealand',
  'Germany' => 'germany',
  'Canada' => 'canada'
}
if main_html.nil?
  warn "failed to fetch main JARL page"
  exit 3
end

updated = false
rules['rules'].each do |r|
  next unless r['home'] == 'japan'
  target = r['target']
  # prepare possible name variants (English and Japanese)
  names = []
  case target
  when 'united_states'
    names = ['アメリカ', 'アメリカ合衆国', 'United States']
  when 'france'
    names = ['フランス', 'France']
  when 'australia'
    names = ['オーストラリア', 'Australia']
  when 'new_zealand'
    names = ['ニュージーランド', 'New Zealand']
  when 'germany'
    names = ['ドイツ', 'Germany']
  when 'canada'
    names = ['カナダ', 'Canada']
  when 'korea'
    names = ['韓国', 'Korea', 'Republic of Korea']
  when 'cept_members'
    names = ['CEPT', 'CEPT T/R 61-02', 'CEPT加盟国']
  else
    names = [target]
  end

  # try direct find first
  link = find_country_link(main_html, names)
  # try to find an href near the country name on the main page
  if link.nil?
    names.each do |nm|
      near = find_link_near_name(main_html, nm)
      if near
        link = near
        break
      end
    end
  end
  page_html = nil
  if link
    link = link.start_with?('http') ? link : (JARL_BASE + (link.start_with?('/') ? link : '/' + link))
    page_html = fetch(link)
  else
    # otherwise iterate candidate links and fetch pages to search for country name
    candidate_links.each do |cl|
      next if link_cache[cl]
      cl_html = fetch(cl)
      if cl_html
        begin
          cl_html = cl_html.encode('UTF-8', invalid: :replace, undef: :replace, replace: '?')
        rescue
          cl_html = cl_html.force_encoding('UTF-8')
        end
        link_cache[cl] = cl_html
        if names.any? { |nm| cl_html.include?(nm) }
          link = cl
          page_html = cl_html
          break
        end
      end
    end
  end
  # fallback: try filename keyword matching for unmapped targets
  if page_html.nil?
    candidate_links.each do |cl|
      keyword_map.each do |kw, tgt|
        if tgt == target && cl.include?(kw)
          page_html = link_cache[cl] || fetch(cl)
          page_html = page_html.encode('UTF-8', invalid: :replace, undef: :replace, replace: '?') rescue page_html.force_encoding('UTF-8')
          link = cl
          break
        end
      end
      break if page_html
    end
  end
  if page_html
    note = extract_detail_note(page_html)
    if note
      r['application_url'] = link
      r['detail_note'] = { 'en' => note, 'ja' => note }
      updated = true
      warn "updated rule for #{target} with application_url"
    else
      # still add link if not note found
      r['application_url'] = link
      updated = true
      warn "added application_url for #{target} (no detail_note found)"
    end
  else
    warn "no direct country link found on main page for #{target} (tried: #{names.join(', ')})"
  end
end

if updated
  File.open(rules_file, 'w') { |f| f.write(rules.to_yaml) }
  puts "rules.yml updated with application_url/detail_note where found"
else
  puts "no updates made"
end
