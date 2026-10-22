require 'json'
require 'net/http'
require 'openssl'
require 'time'
require 'set'

GITLAB_BASE_URL = ENV['GITLAB_BASE_URL']
GITLAB_API_BASE = "#{GITLAB_BASE_URL}/api/v4"
GITLAB_PROJECT_ID = ENV['CI_PROJECT_ID']
GITLAB_ACCESS_TOKEN = ENV['GITLAB_API_TOKEN']

def get_http(uri)
  Net::HTTP.new(uri.host, uri.port).tap do |http|
    http.use_ssl = true
    http.verify_mode = OpenSSL::SSL::VERIFY_PEER
  end
end

def get_commit_sha(tag)
  uri = URI.parse("#{GITLAB_API_BASE}/projects/#{GITLAB_PROJECT_ID}/repository/tags/#{tag}")
  request = Net::HTTP::Get.new(uri.request_uri)
  request["PRIVATE-TOKEN"] = GITLAB_ACCESS_TOKEN

  response = get_http(uri).request(request)

  if response.code.to_i == 200
    JSON.parse(response.body)["commit"]["id"]
  else
    raise "Failed to fetch the commit SHA for tag #{tag}"
  end
end

def get_all_tags
  page = 1
  all_tags = []

  loop do
    uri = URI.parse("#{GITLAB_API_BASE}/projects/#{GITLAB_PROJECT_ID}/repository/tags?page=#{page}&per_page=100")
    request = Net::HTTP::Get.new(uri.request_uri)
    request["PRIVATE-TOKEN"] = GITLAB_ACCESS_TOKEN

    response = get_http(uri).request(request)

    if response.code.to_i == 200
      tags = JSON.parse(response.body)
      break if tags.empty?

      all_tags.concat(tags)
      page += 1
    else
      raise "Failed to fetch the tags (page #{page})"
    end
  end

  all_tags
end

def get_merge_request(mr_iid)
  uri = URI.parse("#{GITLAB_API_BASE}/projects/#{GITLAB_PROJECT_ID}/merge_requests/#{mr_iid}")
  request = Net::HTTP::Get.new(uri.request_uri)
  request["PRIVATE-TOKEN"] = GITLAB_ACCESS_TOKEN
  response = get_http(uri).request(request)

  if response.code.to_i >= 400
    raise "HTTP Error: #{response.code} #{response.message}"
  end

  JSON.parse(response.body)
rescue JSON::ParserError
  raise "Invalid JSON response from GitLab API"
end

def get_merge_request_labels(mr_iid)
  uri = URI.parse("#{GITLAB_API_BASE}/projects/#{GITLAB_PROJECT_ID}/merge_requests/#{mr_iid}")
  request = Net::HTTP::Get.new(uri.request_uri)
  request["PRIVATE-TOKEN"] = GITLAB_ACCESS_TOKEN

  response = get_http(uri).request(request)
  if response.code.to_i == 200
    merge_request = JSON.parse(response.body)
    merge_request['labels']
  else
    []
  end
end

def update_merge_request_labels(mr_iid, labels)
  uri = URI.parse("#{GITLAB_API_BASE}/projects/#{GITLAB_PROJECT_ID}/merge_requests/#{mr_iid}")
  request = Net::HTTP::Put.new(uri.request_uri)
  request["PRIVATE-TOKEN"] = GITLAB_ACCESS_TOKEN
  request.set_form_data("labels" => labels.join(","))

  response = get_http(uri).request(request)
  response.code.to_i == 200
end

def create_release(tag, description)
  uri = URI.parse("#{GITLAB_API_BASE}/projects/#{GITLAB_PROJECT_ID}/releases")
  request = Net::HTTP::Post.new(uri.request_uri)
  request["PRIVATE-TOKEN"] = GITLAB_ACCESS_TOKEN
  request.set_form_data({
    "name" => tag,
    "tag_name" => tag,
    "description" => description
  })

  response = get_http(uri).request(request)
  response.code.to_i == 201
end

# Commit date read LOCALLY (git show), no API dependency. Returns nil + logs
# when unavailable (merged_after bound disabled, full scan).
def get_commit_created_at(sha)
  date = `git show -s --format=%cI #{sha}`.strip
  return nil if date.empty?

  date
rescue StandardError => e
  puts "WARNING: local date for #{sha} unavailable (#{e.message}), merged_after disabled"
  nil
end

def get_mrs_between_tags(from_sha, to_sha, merged_after: nil)
  commits_range = `git log --format='%H' #{from_sha}..#{to_sha}`.split("\n").to_set
  puts "#{commits_range.length} commits in range #{from_sha}..#{to_sha}"

  # merged_after window (previous tag commit date, minus a 24h safety margin):
  # pagination stops as early as possible instead of scanning 2000 MRs.
  # The git-log filter above stays the source of truth (SHA join).
  merged_after_param = nil
  if merged_after
    merged_after_param = begin
      (Time.parse(merged_after) - 86_400).utc.iso8601
    rescue StandardError
      nil
    end
  end

  all_mrs = []
  page = 1
  loop do
    uri = URI.parse("#{GITLAB_API_BASE}/projects/#{GITLAB_PROJECT_ID}/merge_requests?state=merged&target_branch=master&per_page=100&page=#{page}" + (merged_after_param ? "&merged_after=#{URI.encode_www_form_component(merged_after_param)}" : ''))
    request = Net::HTTP::Get.new(uri.request_uri)
    request["PRIVATE-TOKEN"] = GITLAB_ACCESS_TOKEN

    response = get_http(uri).request(request)

    if response.code.to_i == 200
      mrs = JSON.parse(response.body)
      break if mrs.empty?

      all_mrs.concat(mrs)
      page += 1
      break if page > 20
    else
      puts "Failed to fetch MRs: #{response.code} #{response.message}"
      return []
    end
  end

  puts "#{all_mrs.length} total merged MRs on master"

  matched = all_mrs.select do |mr|
    merge_sha = mr["merge_commit_sha"] || mr["squash_commit_sha"]
    merge_sha && commits_range.include?(merge_sha)
  end

  puts "#{matched.length} MRs match commit range"
  matched
end

def update_mr_labels_deploy(mr_iid, labels)
  uri = URI.parse("#{GITLAB_API_BASE}/projects/#{GITLAB_PROJECT_ID}/merge_requests/#{mr_iid}")
  request = Net::HTTP::Put.new(uri.request_uri)
  request["PRIVATE-TOKEN"] = GITLAB_ACCESS_TOKEN
  request.set_form_data("labels" => labels.join(","))

  response = get_http(uri).request(request)
  response.code.to_i == 200
end

def transition_label(mr_iid, from_label, to_label)
  current_labels = get_merge_request_labels(mr_iid)

  if current_labels.include?(from_label)
    current_labels.delete(from_label)
    update_merge_request_labels(mr_iid, current_labels + [to_label])
  end
end

def add_label_if_missing(mr_iid, label)
  current_labels = get_merge_request_labels(mr_iid)

  unless current_labels.include?(label)
    update_merge_request_labels(mr_iid, current_labels + [label])
  end
end

def remove_labels(mr_iid, labels_to_remove)
  current_labels = get_merge_request_labels(mr_iid)
  new_labels = current_labels - labels_to_remove
  update_merge_request_labels(mr_iid, new_labels)
end
