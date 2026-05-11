// DB helpers — one sub-module per table.
// Each helper returns data or throws; never returns null silently.

const posts         = require('./posts');
const media         = require('./media');
const carousels     = require('./carousels');
const carouselTemplates = require('./carouselTemplates');
const voiceProfiles = require('./voiceProfiles');
const platformConnections = require('./platformConnections');
const postAnalytics = require('./postAnalytics');
const aiSessions    = require('./aiSessions');
const platformGroups = require('./platformGroups');
const contentPillars = require('./contentPillars');
const publishLogs   = require('./publishLogs');

module.exports = {
  posts,
  media,
  carousels,
  carouselTemplates,
  voiceProfiles,
  platformConnections,
  postAnalytics,
  aiSessions,
  platformGroups,
  contentPillars,
  publishLogs,
};
