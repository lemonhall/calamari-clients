/*global define*/

define(['jquery', 'underscore', 'backbone', 'templates', 'helpers/graph-utils', 'models/application-model', 'marionette'], function($, _, Backbone, JST, gutils, models) {
    'use strict';

    var GraphwallView = Backbone.Marionette.ItemView.extend({
        template: JST['app/scripts/templates/graphwall-view.ejs'],
        className: 'graph-mode span12',
        ui: {
            'title': '.title'
        },
        graphs: [{
            metrics: ['byte_avail', 'byte_free', 'byte_used'],
            fn: 'makeDiskSpaceBytesGraphUrl',
            util: 'makeDiskSpaceTargets'
        }, {
            metrics: ['inodes_avail', 'inodes_free', 'inodes_used'],
            fn: 'makeDiskSpaceInodesGraphUrl',
            util: 'makeDiskSpaceTargets'
        }, {
            metrics: ['system', 'user', 'idle'],
            fn: 'makeCPUGraphUrl',
            util: 'makeCPUTargets'
        }, {
            metrics: ['system', 'user', 'nice', 'idle', 'iowait', 'irq', 'softirq', 'steal'],
            fn: 'makeCPUDetailGraphUrl',
            util: 'makeCPUDetailedTargets'
        }, {
            metrics: ['op_r_latency', 'op_w_latency', 'op_rw_latency'],
            fn: 'makeOpsLatencyGraphUrl',
            util: 'makeOpLatencyTargets'
        }, {
            metrics: ['journal_ops', 'journal_wr'],
            fn: 'makeJournalOpsGraphUrl',
            util: 'makeFilestoreTargets'
        }, {
            metrics: ['01', '05', '15'],
            fn: 'makeLoadAvgGraphUrl',
            util: 'makeLoadAvgTargets'
        }, {
            metrics: ['Active', 'Buffers', 'Cached', 'MemFree'],
            fn: 'makeMemoryGraphUrl',
            util: 'makeMemoryTargets'
        }],
        makeGraphFunctions: function(options) {
            var targets = gutils.makeTargets(gutils[options.util](options.metrics));
            this[options.fn] = gutils.makeGraphURL('png', this.baseUrl, this.heightWidth, targets);
        },
        initialize: function() {
            this.App = Backbone.Marionette.getOption(this, 'App');
            this.graphiteHost = Backbone.Marionette.getOption(this, 'graphiteHost');
            this.baseUrl = gutils.makeBaseUrl(this.graphiteHost);
            this.heightWidth = gutils.makeHeightWidthParams(442, 266);

            _.bindAll(this, 'makeGraphFunctions');
            _.each(this.graphs, this.makeGraphFunctions);

            this.cpuTargetModels = new models.GraphiteCPUModel(undefined, {
                graphiteHost: this.graphiteHost
            });
            this.ioTargetModels = new models.GraphiteIOModel(undefined, {
                graphiteHost: this.graphiteHost
            });
        },
        makeCPUDetail: function(hostname) {
            var model = this.cpuTargetModels;
            var fn = this.makeCPUDetailGraphUrl;
            var self = this;
            var deferred = $.Deferred();
            model.fetchMetrics(hostname).done(function() {
                var list = model.cpuList();
                deferred.resolve(_.map(list, function(cpuid) {
                    return fn.call(self, hostname, cpuid);
                }));
            }).fail(function() {
                deferred.reject();
            });
            return deferred.promise();
        },
        makeHostUrls: function(fn) {
            return function() {
                var hosts = this.App.ReqRes.request('get:hosts');
                return _.map(hosts, function(host) {
                    return fn(host);
                });
            };
        },
        selectors: ['0-1', '0-2', '1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'],
        imageLoader: function($el, url) {
            setTimeout(function() {
                $el.html('<i class="icon-spinner icon-spin icon-large icon-3x"></i>');
                var image = new Image();
                image.src = url;
                image.onload = function() {
                    $el.html(image);
                };
                image.onerror = function() {
                    $el.html('<i class="icon-exclamation icon-large icon-3x"></i>');
                };
            }, 0);
        },
        makeHostGraphUrl: function(host) {
            return function() {
                return [this.makeCPUGraphUrl(host), this.makeLoadAvgGraphUrl(host), this.makeMemoryGraphUrl(host)];
            };
        },
        hideGraphs: function() {
            this.$('.graph-card').css('visibility', 'hidden');
        },
        populateAll: function(title, fn) {
            var urls = fn.call(this);
            var self = this;
            this.ui.title.text(title);
            _.each(urls, function(url, index) {
                var $graph = self.$('.graph' + self.selectors[index]);
                $graph.css('visibility', 'visible');
                self.imageLoader($graph, url);
            });
        }
    });

    return GraphwallView;
});
