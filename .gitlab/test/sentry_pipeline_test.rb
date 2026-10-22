# frozen_string_literal: true

# Tests for the pure functions of the "Fixes <REF>" pipeline:
# - aggregate_sentry_refs (sentry.rb): merging refs across merged MRs;
# - sentry_issue_action (sentry.rb): GET-first decision / triage protection;
# - partial_delivery_blockers (redmine.rb): partial delivery guard.
# Network functions (sentry_api, PUT, fetch) are NOT tested here, they are
# exercised read-only against the real API (see MR description).
# All identifiers below are FICTIONAL.
# Run: ruby .gitlab/test/sentry_pipeline_test.rb

require 'minitest/autorun'
require_relative '../sentry'
require_relative '../redmine'

describe 'aggregate_sentry_refs' do
  it 'dedupes across MRs and splits own/cross/urls/placeholders' do
    mrs = [
      { 'description' => "Fixes WEBAPP-E5F6\nhttps://sentry-kchat.infomaniak.com/organizations/sentry/issues/333333/" },
      { 'description' => 'Fixes WEBAPP-E5F6 et WEBAPP-A1B2 + MOBILE-42AB' },
      { 'description' => 'Fixes RM-111111, fixes https://redmine.infomaniak.ch/issues/222222' },
      { 'description' => 'mention nue WEBAPP-XXXX et Fixes WEBAPP-XXX (placeholder)' }
    ]
    r = aggregate_sentry_refs(mrs, own_prefix: 'WEBAPP')
    _(r[:short_ids]).must_equal %w[WEBAPP-E5F6 WEBAPP-A1B2]
    _(r[:issue_ids]).must_equal %w[333333]
    _(r[:cross_short_ids]).must_equal %w[MOBILE-42AB]
    _(r[:placeholders]).must_equal ['WEBAPP-XXX']
  end

  it 'makes no Sentry decision on MRs without Sentry refs' do
    r = aggregate_sentry_refs([{ 'description' => 'Fixes RM-111111' }], own_prefix: 'WEBAPP')
    _(r[:short_ids]).must_be_empty
    _(r[:issue_ids]).must_be_empty
    _(r[:cross_short_ids]).must_be_empty
    _(r[:placeholders]).must_be_empty
  end

  it 'tolerates an empty or nil MR list' do
    _(aggregate_sentry_refs([], own_prefix: 'WEBAPP')[:short_ids]).must_be_empty
    _(aggregate_sentry_refs(nil, own_prefix: 'WEBAPP')[:short_ids]).must_be_empty
  end
end

describe 'sentry_issue_action' do
  it 'resolves an unresolved issue' do
    _(sentry_issue_action({ 'status' => 'unresolved', 'statusDetails' => {} })).must_equal :resolve
  end

  it 'skips an issue already anchored in a release (first-tag-wins)' do
    issue = { 'status' => 'resolved', 'statusDetails' => { 'inRelease' => 'webapp@2.10.35-beta.4' } }
    _(sentry_issue_action(issue)).must_equal :skip_anchored
  end

  it 're-anchors an issue resolved without anchor (pending backlog)' do
    _(sentry_issue_action({ 'status' => 'resolved', 'statusDetails' => {} })).must_equal :resolve_backlog
  end

  it 'protects triage: ignored => skip, never overwritten' do
    _(sentry_issue_action({ 'status' => 'ignored', 'substatus' => 'archived_until_escalating' })).must_equal :skip_ignored
  end

  it 'protects triage: archived_* substatus => skip whatever the serialization' do
    _(sentry_issue_action({ 'status' => 'unresolved', 'substatus' => 'archived_forever' })).must_equal :skip_archived
  end
end

describe 'partial_delivery_blockers' do
  before do
    @open_mrs = {
      'webapp' => [{ 'iid' => 101, 'description' => 'Fixes RM-111111' }],
      'desktop' => [{ 'iid' => 202, 'description' => "## Ticket\nFixes RM-111111" }],
      'mobile' => [{ 'iid' => 303, 'description' => 'liens : https://redmine.infomaniak.ch/issues/111111' }]
    }
  end

  it 'detects open MRs claiming the same ticket (multi-repo)' do
    blockers = partial_delivery_blockers('111111', @open_mrs)
    _(blockers).must_equal ['webapp !101', 'desktop !202']
  end

  it 'ignores a bare mention without a resolution keyword' do
    _(partial_delivery_blockers('111111', 'mobile' => [{ 'iid' => 303, 'description' => 'https://redmine.infomaniak.ch/issues/111111' }])).must_be_empty
  end

  it 'returns empty when no open MR claims the ticket' do
    _(partial_delivery_blockers('999999', @open_mrs)).must_be_empty
  end
end
