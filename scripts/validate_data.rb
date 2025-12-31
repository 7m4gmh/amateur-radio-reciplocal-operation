#!/usr/bin/env ruby
require 'yaml'
require 'uri'

ROOT = File.expand_path('..', __dir__)
licenses_file = File.join(ROOT, '_data', 'licenses.yml')
rules_file = File.join(ROOT, '_data', 'rules.yml')

errors = []

unless File.exist?(licenses_file)
  STDERR.puts "licenses file not found: #{licenses_file}"
  exit 2
end
unless File.exist?(rules_file)
  STDERR.puts "rules file not found: #{rules_file}"
  exit 2
end

licenses = YAML.load_file(licenses_file)
rules_data = YAML.load_file(rules_file)

# Build map: country id -> set of class ids
license_map = {}
licenses.each do |entry|
  id = entry['id']
  classes = (entry['classes'] || []).map { |c| c['id'].to_s }
  license_map[id.to_s] = classes
end

rules = rules_data['rules'] || []
rules.each_with_index do |r, idx|
  home = r['home']&.to_s
  target = r['target']&.to_s
  unless home && target
    errors << "rule[#{idx}]: missing home or target: #{r.inspect}"
    next
  end
  unless license_map.key?(home)
    errors << "rule[#{idx}]: home country '#{home}' not found in _data/licenses.yml"
    next
  end
  allowed = r['allowed_home_classes'] || []
  allowed.each do |cls|
    cls_s = cls.to_s
    unless license_map[home].include?(cls_s)
      errors << "rule[#{idx}]: allowed_home_classes contains '#{cls_s}' which is not defined for home='#{home}' in _data/licenses.yml"
    end
  end

  # optional: validate links
  if r['links'] && r['links'].is_a?(Array)
    r['links'].each_with_index do |link, li|
      url = link['url']
      begin
        uri = URI.parse(url)
        unless uri.kind_of?(URI::HTTP) || uri.kind_of?(URI::HTTPS)
          errors << "rule[#{idx}].links[#{li}]: invalid url '#{url}'"
        end
      rescue => e
        errors << "rule[#{idx}].links[#{li}]: url parse error '#{url}': #{e.message}"
      end
    end
  end
end

if errors.any?
  STDERR.puts "Data validation failed with #{errors.size} error(s):"
  errors.each { |e| STDERR.puts " - #{e}" }
  exit 3
end

puts "Data validation passed: licenses and rules look consistent"
exit 0
