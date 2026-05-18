// DB helpers — one sub-module per table.
// Each helper returns data or throws; never returns null silently.

const posts         = require('./posts');
const media         = require('./media');
const voiceProfiles = require('./voiceProfiles');
const platformConnections  = require('./platformConnections');
const platformCredentials  = require('./platformCredentials');
const postAnalytics = require('./postAnalytics');
const aiSessions    = require('./aiSessions');
const platformGroups = require('./platformGroups');
const contentPillars = require('./contentPillars');
const publishLogs   = require('./publishLogs');
const emailRecipients = require('./emailRecipients');
const feedSources   = require('./feedSources');
const feedItems     = require('./feedItems');
const aiModels      = require('./aiModels');

module.exports = {
  posts,
  media,
  voiceProfiles,
  platformConnections,
  platformCredentials,
  postAnalytics,
  aiSessions,
  platformGroups,
  contentPillars,
  publishLogs,
  emailRecipients,
  feedSources,
  feedItems,
  aiModels,
};
