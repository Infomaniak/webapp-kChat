require 'json'
require 'net/http'

require_relative 'gitlab'
require_relative 'sentry_refs'

REDMINE_DOMAIN = ENV['REDMINE_DOMAIN']
REDMINE_API_KEY = ENV['REDMINE_API_KEY']

# Only refs preceded by a resolution keyword (native Sentry set,
# case-insensitive) trigger a comment and a status change. A bare Redmine URL
# in the description = mere mention, no action. See sentry_refs.rb.
def extract_redmine_links(description)
  SentryRefs.extract(description.to_s)[:redmine_ids]
end

def update_redmine_ticket_status(issue_id, new_status_id)
  uri = URI.parse("https://#{REDMINE_DOMAIN}/issues/#{issue_id}.json")
  request = Net::HTTP::Put.new(uri)
  request.content_type = "application/json"
  request['X-Redmine-API-Key'] = REDMINE_API_KEY
  request.body = JSON.dump({
    "issue" => {
      "status_id" => new_status_id
    }
  })

  response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == 'https') do |http|
    http.request(request)
  end

  if response.is_a?(Net::HTTPSuccess)
    puts "Issue ##{issue_id} updated successfully."
  else
    puts "Failed to update issue ##{issue_id}. Response: #{response.body}"
  end
end

def leave_comment_on_redmine_ticket(issue_id, comment, is_private = false)
  uri = URI.parse("https://#{REDMINE_DOMAIN}/issues/#{issue_id}.json")
  request = Net::HTTP::Put.new(uri)
  request.content_type = "application/json"
  request['X-Redmine-API-Key'] = REDMINE_API_KEY
  request.body = JSON.dump({
    "issue" => {
      "notes" => comment,
      "private_notes" => is_private
    }
  })

  response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == 'https') do |http|
    http.request(request)
  end

  if response.is_a?(Net::HTTPSuccess)
    puts "Comment added to issue ##{issue_id}."
  else
    puts "Failed to add comment to issue ##{issue_id}. Response: #{response.body}"
  end
end

# Partial delivery guard (stable): status 3 only once every MR of the 3 repos
# claiming the ticket is shipped.
STABLE_DELIVERY_GUARD_REPOS = ['webapp', 'desktop', 'mobile']

# Pure (testable): "repo !iid" of open MRs still claiming the ticket.
def partial_delivery_blockers(issue_id, mrs_by_repo)
  mrs_by_repo.flat_map do |repo, mrs|
    mrs.select { |mr| SentryRefs.extract(mr['description'].to_s)[:redmine_ids].include?(issue_id.to_s) }
       .map { |mr| "#{repo} !#{mr['iid']}" }
  end
end

def fetch_open_mrs_by_repo(repos = STABLE_DELIVERY_GUARD_REPOS)
  repos.each_with_object({}) do |repo, acc|
    mrs = []
    page = 1
    loop do
      uri = URI.parse("#{GITLAB_API_BASE}/projects/kchat%2F#{repo}/merge_requests?state=opened&per_page=100&page=#{page}")
      request = Net::HTTP::Get.new(uri.request_uri)
      request['PRIVATE-TOKEN'] = GITLAB_ACCESS_TOKEN
      response = get_http(uri).request(request)
      raise "open MRs #{repo} => HTTP #{response.code}" unless response.code.to_i == 200

      batch = JSON.parse(response.body)
      mrs.concat(batch)
      page += 1
      if batch.length == 100 && page > 5
        puts "WARNING: more than 500 open MRs on #{repo}, truncated scan (degraded partial delivery guard)"
        break
      end
      break if batch.length < 100
    end
    acc[repo] = mrs
  end
rescue StandardError => e
  puts "WARNING: open MR scan failed (guard disabled, historical behavior): #{e.message}"
  nil
end

# Fail-open : Redmine indisponible ne doit pas faire echouer la release.
def fail_open_redmine(issue_id)
  yield
rescue StandardError => e
  puts "WARNING redmine ##{issue_id}: #{e.class}: #{e.message}"
end

def handle_stable_redmine(merged_mrs, version)
  issue_ids = merged_mrs.flat_map { |mr| extract_redmine_links(mr['description']) }.uniq
  open_mrs_by_repo = fetch_open_mrs_by_repo

  issue_ids.each do |issue_id|
    blockers = open_mrs_by_repo ? partial_delivery_blockers(issue_id, open_mrs_by_repo) : []
    unless blockers.empty?
      fail_open_redmine(issue_id) do
        leave_comment_on_redmine_ticket(issue_id, "fix released in stable version #{version}, but partially delivered: the following MRs are still open with Fixes RM-#{issue_id}: #{blockers.join(', ')}. Status unchanged, it will move to status 3 once every MR of the batch is shipped.")
        puts "Redmine ##{issue_id}: partial delivery (#{blockers.join(', ')}), status unchanged"
      end
      next
    end
    fail_open_redmine(issue_id) do
      leave_comment_on_redmine_ticket(issue_id, "fix released in stable version #{version}")
      update_redmine_ticket_status(issue_id, 3)
      puts "Redmine ##{issue_id}: commentaire + statut 3 (#{version})"
    end
  end
end

def handle_next_redmine(mr_description, version)
  redmine_links = extract_redmine_links(mr_description)
  redmine_links.each do |issue_id|
    fail_open_redmine(issue_id) do
      leave_comment_on_redmine_ticket(issue_id, "fix deployed in next version #{version}")
      puts "Commented redmine ##{issue_id} to notify about canary deploy"
    end
  end
end
