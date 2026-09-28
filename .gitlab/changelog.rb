require_relative 'gitlab'

def valid_version?(version)
  version =~ /\A\d+\.\d+\.\d+(-beta\.\d+|-rc\.\d+)?\z/
end

def parse_version(version)
  if version.include?('-beta.')
    main, pre_release = version.split('-beta.')
    parts = main.split('.').map(&:to_i)
    parts << 1 << pre_release.to_i
  elsif version.include?('-rc.')
    main, pre_release = version.split('-rc.')
    parts = main.split('.').map(&:to_i)
    parts << 2 << pre_release.to_i
  else
    main = version
    parts = main.split('.').map(&:to_i)
    parts << 0 << -1
  end
  parts
end

def compare_versions(v1, v2)
  length = [v1.length, v2.length].max
  (0...length).each do |i|
    a = v1[i] || 0
    b = v2[i] || 0
    return a <=> b if a != b
  end
  0
end

def get_last_tag(current_tag)
  is_pre_release = current_tag.include?('-beta.') || current_tag.include?('-rc.')
  all_tags = get_all_tags.select { |tag| valid_version?(tag["name"]) }

  current_tag_parts = parse_version(current_tag)
  previous_tags = all_tags.select do |tag|
    is_tag_pre_release = tag["name"].include?('-beta.') || tag["name"].include?('-rc.')
    next false if is_pre_release != is_tag_pre_release
    compare_versions(parse_version(tag["name"]), current_tag_parts) < 0
  end

  if previous_tags.empty?
    previous_tags = all_tags.select { |tag| compare_versions(parse_version(tag["name"]), current_tag_parts) < 0 }
  end

  if previous_tags.empty?
    raise "No previous tags found that meet the criteria."
  else
    previous_tags.max_by { |tag| parse_version(tag["name"]) }["name"]
  end
end

def get_changelog(tag)
  puts "Generating changelog for tag #{tag}"
  last_tag = get_last_tag(tag)
  puts "Last tag: #{last_tag}"

  `git fetch --tags origin`

  config_path = File.join(__dir__, '..', 'cliff.toml')
  cmd = "git-cliff --ignore-tags '.*' --config #{config_path} #{last_tag}..#{tag}"
  puts "Running: #{cmd}"

  output = `#{cmd}`

  if $?&.exitstatus != 0
    raise "Error generating changelog: #{output}"
  end

  output.strip.empty? ? "No changes found" : output.strip
rescue StandardError => e
  raise "Error generating changelog: #{e.message}"
end

def get_changelog_with_shas(tag)
  last_tag = get_last_tag(tag)
  from_commit_sha = get_commit_sha(last_tag)
  to_commit_sha = get_commit_sha(tag)
  changelog = get_changelog(tag)

  [changelog, from_commit_sha, to_commit_sha]
end
