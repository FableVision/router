(function (QUnit) {

    var router = null;
    var location = null;
    var lastRoute = null;
    var lastArgs = [];

    var onRoute = function (routerParam, route, args) {
        lastRoute = route;
        lastArgs = args;
    };

    class Location
    {
        constructor(href) {
            this.parser = document.createElement('a');
            this.replace(href);
        }

        replace(href) {
            this.parser.href = href;
            Object.assign(this, {
                'href': this.parser.href,
                'hash': this.parser.hash,
                'host': this.parser.host,
                'search': this.parser.search,
                'fragment': this.parser.fragment,
                'pathname': this.parser.pathname,
                'protocol': this.parser.protocol
            });

            // In IE, anchor.pathname does not contain a leading slash though
            // window.location.pathname does.
            if (!/^\//.test(this.pathname)) this.pathname = '/' + this.pathname;
        }

        toString() {
            return this.href;
        }
    }

    var historyRoute = null;
    QUnit.module('Backbone.Router', {

        beforeEach: function () {
            location = new Location('http://example.com');
            Backbone.Router.injectedHistory = Backbone.history = Object.assign(new Backbone.History, {
                location: location
            });
            router = new Router({
                testing: 101
            });
            Backbone.history.interval = 9;
            Backbone.history.start({
                pushState: false
            });
            lastRoute = null;
            lastArgs = [];
            historyRoute = Backbone.history.routeEvent.on(onRoute);
        },

        afterEach: function () {
            Backbone.history.stop();
            historyRoute.dispose();
        }

    });

    var ExternalObject = {
        value: 'unset',

        routingFunction: function (value) {
            this.value = value;
        }
    };
    ExternalObject.routingFunction = ExternalObject.routingFunction.bind(ExternalObject);

    class Router extends Backbone.Router
    {
        constructor(options)
        {
            super(options);
            this.count = 0;
        }

        preinitialize(options) {
            this.testpreinit = 'foo';
            if (!options.routes) options.routes = {};
            Object.assign(options.routes, {
                'noCallback': 'noCallback',
                'counter': 'counter',
                'search/:query': 'search',
                'search/:query/p:page': 'search',
                'char??': 'charUTF',
                'char%C3%B1': 'charEscaped',
                'contacts': 'contacts',
                'contacts/new': 'newContact',
                'contacts/:id': 'loadContact',
                'route-event/:arg': 'routeEvent',
                'optional(/:item)': 'optionalItem',
                'named/optional/(y:z)': 'namedOptional',
                'splat/*args/end': 'splat',
                ':repo/compare/*from...*to': 'github',
                'decode/:named/*splat': 'decode',
                '*first/complex-*part/*rest': 'complex',
                'query/:entity': 'query',
                'function/:value': ExternalObject.routingFunction,
                '*anything': 'anything'
            });
        }

        initialize(options) {
            this.testing = options.testing;
            this.route('implicit', () => {
                this.count++;
            });
        }

        counter() {
            this.count++;
        }

        search(query, page) {
            this.query = query;
            this.page = page;
        }

        charUTF() {
            this.charType = 'UTF';
        }

        charEscaped() {
            this.charType = 'escaped';
        }

        contacts() {
            this.contact = 'index';
        }

        newContact() {
            this.contact = 'new';
        }

        loadContact() {
            this.contact = 'load';
        }

        optionalItem(arg) {
            this.arg = arg !== void 0 ? arg : null;
        }

        splat(args) {
            this.args = args;
        }

        github(repo, from, to) {
            this.repo = repo;
            this.from = from;
            this.to = to;
        }

        complex(first, part, rest) {
            this.first = first;
            this.part = part;
            this.rest = rest;
        }

        query(entity, args) {
            this.entity = entity;
            this.queryArgs = args;
        }

        anything(whatever) {
            this.anything = whatever;
        }

        namedOptional(z) {
            this.z = z;
        }

        decode(named, path) {
            this.named = named;
            this.path = path;
        }

        routeEvent(arg) {}
    };

    QUnit.test('initialize', function (assert) {
        assert.expect(1);
        assert.equal(router.testing, 101);
    });

    QUnit.test('preinitialize', function (assert) {
        assert.expect(1);
        assert.equal(router.testpreinit, 'foo');
    });

    QUnit.test('routes (simple)', function (assert) {
        assert.expect(4);
        location.replace('http://example.com#search/news');
        Backbone.history.checkUrl();
        assert.equal(router.query, 'news');
        assert.equal(router.page, void 0);
        assert.equal(lastRoute, 'search');
        assert.equal(lastArgs[0], 'news');
    });

    QUnit.test('routes (simple, but unicode)', function (assert) {
        assert.expect(4);
        location.replace('http://example.com#search/????????');
        Backbone.history.checkUrl();
        assert.equal(router.query, '????????');
        assert.equal(router.page, void 0);
        assert.equal(lastRoute, 'search');
        assert.equal(lastArgs[0], '????????');
    });

    QUnit.test('routes (two part)', function (assert) {
        assert.expect(2);
        location.replace('http://example.com#search/nyc/p10');
        Backbone.history.checkUrl();
        assert.equal(router.query, 'nyc');
        assert.equal(router.page, '10');
    });

    QUnit.test('routes via navigate', function (assert) {
        assert.expect(2);
        Backbone.history.navigate('search/manhattan/p20', {
            trigger: true
        });
        assert.equal(router.query, 'manhattan');
        assert.equal(router.page, '20');
    });

    QUnit.test('routes via navigate with params', function (assert) {
        assert.expect(1);
        Backbone.history.navigate('query/test?a=b', {
            trigger: true
        });
        assert.equal(router.queryArgs, 'a=b');
    });

    QUnit.test('routes via navigate for backwards-compatibility', function (assert) {
        assert.expect(2);
        Backbone.history.navigate('search/manhattan/p20', true);
        assert.equal(router.query, 'manhattan');
        assert.equal(router.page, '20');
    });

    QUnit.test('reports matched route via nagivate', function (assert) {
        assert.expect(1);
        assert.ok(Backbone.history.navigate('search/manhattan/p20', true));
    });

    QUnit.test('route precedence via navigate', function (assert) {
        assert.expect(6);

        // Check both 0.9.x and backwards-compatibility options
        [{
            trigger: true
        }, true].forEach(function (options) {
            Backbone.history.navigate('contacts', options);
            assert.equal(router.contact, 'index');
            Backbone.history.navigate('contacts/new', options);
            assert.equal(router.contact, 'new');
            Backbone.history.navigate('contacts/foo', options);
            assert.equal(router.contact, 'load');
        });
    });

    QUnit.test('loadUrl is not called for identical routes.', function (assert) {
        assert.expect(0);
        Backbone.history.loadUrl = function () {
            assert.ok(false);
        };
        location.replace('http://example.com#route');
        Backbone.history.navigate('route');
        Backbone.history.navigate('/route');
        Backbone.history.navigate('/route');
    });

    QUnit.test('use implicit callback if none provided', function (assert) {
        assert.expect(1);
        router.count = 0;
        router.navigate('implicit', {
            trigger: true
        });
        assert.equal(router.count, 1);
    });

    QUnit.test('routes via navigate with {replace: true}', function (assert) {
        assert.expect(1);
        location.replace('http://example.com#start_here');
        Backbone.history.checkUrl();
        location.replace = function (href) {
            assert.strictEqual(href, new Location('http://example.com#end_here').href);
        };
        Backbone.history.navigate('end_here', {
            replace: true
        });
    });

    QUnit.test('routes (splats)', function (assert) {
        assert.expect(1);
        location.replace('http://example.com#splat/long-list/of/splatted_99args/end');
        Backbone.history.checkUrl();
        assert.equal(router.args, 'long-list/of/splatted_99args');
    });

    QUnit.test('routes (github)', function (assert) {
        assert.expect(3);
        location.replace('http://example.com#backbone/compare/1.0...braddunbar:with/slash');
        Backbone.history.checkUrl();
        assert.equal(router.repo, 'backbone');
        assert.equal(router.from, '1.0');
        assert.equal(router.to, 'braddunbar:with/slash');
    });

    QUnit.test('routes (optional)', function (assert) {
        assert.expect(2);
        location.replace('http://example.com#optional');
        Backbone.history.checkUrl();
        assert.ok(!router.arg);
        location.replace('http://example.com#optional/thing');
        Backbone.history.checkUrl();
        assert.equal(router.arg, 'thing');
    });

    QUnit.test('routes (complex)', function (assert) {
        assert.expect(3);
        location.replace('http://example.com#one/two/three/complex-part/four/five/six/seven');
        Backbone.history.checkUrl();
        assert.equal(router.first, 'one/two/three');
        assert.equal(router.part, 'part');
        assert.equal(router.rest, 'four/five/six/seven');
    });

    QUnit.test('routes (query)', function (assert) {
        assert.expect(5);
        location.replace('http://example.com#query/mandel?a=b&c=d');
        Backbone.history.checkUrl();
        assert.equal(router.entity, 'mandel');
        assert.equal(router.queryArgs, 'a=b&c=d');
        assert.equal(lastRoute, 'query');
        assert.equal(lastArgs[0], 'mandel');
        assert.equal(lastArgs[1], 'a=b&c=d');
    });

    QUnit.test('routes (anything)', function (assert) {
        assert.expect(1);
        location.replace('http://example.com#doesnt-match-a-route');
        Backbone.history.checkUrl();
        assert.equal(router.anything, 'doesnt-match-a-route');
    });

    QUnit.test('routes (function)', function (assert) {
        assert.expect(3);
        router.routeEvent.on(function (name) {
            assert.ok(name === '');
        });
        assert.equal(ExternalObject.value, 'unset');
        location.replace('http://example.com#function/set');
        Backbone.history.checkUrl();
        assert.equal(ExternalObject.value, 'set');
    });

    QUnit.test('Decode named parameters, not splats.', function (assert) {
        assert.expect(2);
        location.replace('http://example.com#decode/a%2Fb/c%2Fd/e');
        Backbone.history.checkUrl();
        assert.strictEqual(router.named, 'a/b');
        assert.strictEqual(router.path, 'c/d/e');
    });

    QUnit.test('fires event when router doesn\'t have callback on it', function (assert) {
        assert.expect(2);
        router.routeEvent.on(function (name) {
            assert.ok(name === 'noCallback');
            assert.ok(true);
        });
        location.replace('http://example.com#noCallback');
        Backbone.history.checkUrl();
    });

    QUnit.test('No events are triggered if #execute returns false.', function (assert) {
        assert.expect(1);
        class MyRouter extends Backbone.Router
        {
            constructor()
            {
                super({
                    routes: {
                        foo: function () {
                            assert.ok(true);
                        }
                    },
                });
            }

            execute(callback, args) {
                callback.apply(this, args);
                return false;
            }
        }

        var myRouter = new MyRouter;

        myRouter.routeEvent.on(function () {
            assert.ok(false);
        });

        Backbone.history.routeEvent.on(function () {
            assert.ok(false);
        });

        location.replace('http://example.com#foo');
        Backbone.history.checkUrl();
    });

    QUnit.test('#933, #908 - leading slash', function (assert) {
        assert.expect(2);
        location.replace('http://example.com/root/foo');

        Backbone.history.stop();
        Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        Backbone.history.start({
            root: '/root',
            hashChange: false,
            silent: true
        });
        assert.strictEqual(Backbone.history.getFragment(), 'foo');

        Backbone.history.stop();
        Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        Backbone.history.start({
            root: '/root/',
            hashChange: false,
            silent: true
        });
        assert.strictEqual(Backbone.history.getFragment(), 'foo');
    });

    QUnit.test('#967 - Route callback gets passed encoded values.', function (assert) {
        assert.expect(3);
        var route = 'has%2Fslash/complex-has%23hash/has%20space';
        Backbone.history.navigate(route, {
            trigger: true
        });
        assert.strictEqual(router.first, 'has/slash');
        assert.strictEqual(router.part, 'has#hash');
        assert.strictEqual(router.rest, 'has space');
    });

    QUnit.test('correctly handles URLs with % (#868)', function (assert) {
        assert.expect(3);
        location.replace('http://example.com#search/fat%3A1.5%25');
        Backbone.history.checkUrl();
        location.replace('http://example.com#search/fat');
        Backbone.history.checkUrl();
        assert.equal(router.query, 'fat');
        assert.equal(router.page, void 0);
        assert.equal(lastRoute, 'search');
    });

    QUnit.test('#2666 - Hashes with UTF8 in them.', function (assert) {
        assert.expect(2);
        Backbone.history.navigate('char??', {
            trigger: true
        });
        assert.equal(router.charType, 'UTF');
        Backbone.history.navigate('char%C3%B1', {
            trigger: true
        });
        assert.equal(router.charType, 'UTF');
    });

    QUnit.test('#1185 - Use pathname when hashChange is not wanted.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        location.replace('http://example.com/path/name#hash');
        Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        Backbone.history.start({
            hashChange: false
        });
        var fragment = Backbone.history.getFragment();
        assert.strictEqual(fragment, location.pathname.replace(/^\//, ''));
    });

    QUnit.test('#1206 - Strip leading slash before location.assign.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        location.replace('http://example.com/root/');
        Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        Backbone.history.start({
            hashChange: false,
            root: '/root/'
        });
        location.assign = function (pathname) {
            assert.strictEqual(pathname, '/root/fragment');
        };
        Backbone.history.navigate('/fragment');
    });

    QUnit.test('#1387 - Root fragment without trailing slash.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        location.replace('http://example.com/root');
        Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        Backbone.history.start({
            hashChange: false,
            root: '/root/',
            silent: true
        });
        assert.strictEqual(Backbone.history.getFragment(), '');
    });

    QUnit.test('#1366 - History does not prepend root to fragment.', function (assert) {
        assert.expect(2);
        Backbone.history.stop();
        location.replace('http://example.com/root/');
        Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: function (state, title, url) {
                    assert.strictEqual(url, '/root/x');
                }
            }
        });
        Backbone.history.start({
            root: '/root/',
            pushState: true,
            hashChange: false
        });
        Backbone.history.navigate('x');
        assert.strictEqual(Backbone.history.fragment, 'x');
    });

    QUnit.test('Normalize root.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        location.replace('http://example.com/root');
        Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: function (state, title, url) {
                    assert.strictEqual(url, '/root/fragment');
                }
            }
        });
        Backbone.history.start({
            pushState: true,
            root: '/root',
            hashChange: false
        });
        Backbone.history.navigate('fragment');
    });

    QUnit.test('Normalize root.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        location.replace('http://example.com/root#fragment');
        Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: function (state, title, url) {},
                replaceState: function (state, title, url) {
                    assert.strictEqual(url, '/root/fragment');
                }
            }
        });
        Backbone.history.start({
            pushState: true,
            root: '/root'
        });
    });

    QUnit.test('Normalize root.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        location.replace('http://example.com/root');
        Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        Backbone.history.loadUrl = function () {
            assert.ok(true);
        };
        Backbone.history.start({
            pushState: true,
            root: '/root'
        });
    });

    QUnit.test('Normalize root - leading slash.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        location.replace('http://example.com/root');
        Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: function () {},
                replaceState: function () {}
            }
        });
        Backbone.history.start({
            root: 'root'
        });
        assert.strictEqual(Backbone.history.root, '/root/');
    });

    QUnit.test('Transition from hashChange to pushState.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        location.replace('http://example.com/root#x/y');
        Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: function () {},
                replaceState: function (state, title, url) {
                    assert.strictEqual(url, '/root/x/y');
                }
            }
        });
        Backbone.history.start({
            root: 'root',
            pushState: true
        });
    });

    QUnit.test('#1619: Router: Normalize empty root', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        location.replace('http://example.com/');
        Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: function () {},
                replaceState: function () {}
            }
        });
        Backbone.history.start({
            root: ''
        });
        assert.strictEqual(Backbone.history.root, '/');
    });

    QUnit.test('#1619: Router: nagivate with empty root', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        location.replace('http://example.com/');
        Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: function (state, title, url) {
                    assert.strictEqual(url, '/fragment');
                }
            }
        });
        Backbone.history.start({
            pushState: true,
            root: '',
            hashChange: false
        });
        Backbone.history.navigate('fragment');
    });

    QUnit.test('Transition from pushState to hashChange.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        location.replace('http://example.com/root/x/y?a=b');
        location.replace = function (url) {
            assert.strictEqual(url, '/root#x/y?a=b');
        };
        Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: null,
                replaceState: null
            }
        });
        Backbone.history.start({
            root: 'root',
            pushState: true
        });
    });

    QUnit.test('#1695 - hashChange to pushState with search.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        location.replace('http://example.com/root#x/y?a=b');
        Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: function () {},
                replaceState: function (state, title, url) {
                    assert.strictEqual(url, '/root/x/y?a=b');
                }
            }
        });
        Backbone.history.start({
            root: 'root',
            pushState: true
        });
    });

    QUnit.test('#1746 - Router allows empty route.', function (assert) {
        assert.expect(1);
        class MyRouter extends Backbone.Router
        {
            constructor()
            {
                super({
                    routes: {
                        '': function () {}
                    },
                });
            }

            route(route) {
                assert.strictEqual(route, '');
            }
        };
        new MyRouter;
    });

    QUnit.test('#1794 - Trailing space in fragments.', function (assert) {
        assert.expect(1);
        var history = new Backbone.History;
        assert.strictEqual(history.getFragment('fragment   '), 'fragment');
    });

    QUnit.test('#1820 - Leading slash and trailing space.', function (assert) {
        assert.expect(1);
        var history = new Backbone.History;
        assert.strictEqual(history.getFragment('/fragment '), 'fragment');
    });

    QUnit.test('#1980 - Optional parameters.', function (assert) {
        assert.expect(2);
        location.replace('http://example.com#named/optional/y');
        Backbone.history.checkUrl();
        assert.strictEqual(router.z, undefined);
        location.replace('http://example.com#named/optional/y123');
        Backbone.history.checkUrl();
        assert.strictEqual(router.z, '123');
    });

    QUnit.test('#2062 - Trigger "route" event on router instance.', function (assert) {
        assert.expect(2);
        router.routeEvent.on(function (name, args) {
            assert.strictEqual(name, 'routeEvent');
            assert.deepEqual(args, ['x', null]);
        });
        location.replace('http://example.com#route-event/x');
        Backbone.history.checkUrl();
    });

    QUnit.test('#2538 - hashChange to pushState only if both requested.', function (assert) {
        assert.expect(0);
        Backbone.history.stop();
        location.replace('http://example.com/root?a=b#x/y');
        Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: function () {},
                replaceState: function () {
                    assert.ok(false);
                }
            }
        });
        Backbone.history.start({
            root: 'root',
            pushState: true,
            hashChange: false
        });
    });

    QUnit.test('No hash fallback.', function (assert) {
        assert.expect(0);
        Backbone.history.stop();
        Backbone.Router.injectedHistory = Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: function () {},
                replaceState: function () {}
            }
        });

        class MyRouter extends Backbone.Router
        {
            constructor()
            {
                super({
                    routes: {
                        hash: function () {
                            assert.ok(false);
                        }
                    }
                });
            }
        }
        var myRouter = new MyRouter;

        location.replace('http://example.com/');
        Backbone.history.start({
            pushState: true,
            hashChange: false
        });
        location.replace('http://example.com/nomatch#hash');
        Backbone.history.checkUrl();
    });

    QUnit.test('#2656 - No trailing slash on root.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: function (state, title, url) {
                    assert.strictEqual(url, '/root');
                }
            }
        });
        location.replace('http://example.com/root/path');
        Backbone.history.start({
            pushState: true,
            hashChange: false,
            root: 'root'
        });
        Backbone.history.navigate('');
    });

    QUnit.test('#2656 - No trailing slash on root.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: function (state, title, url) {
                    assert.strictEqual(url, '/');
                }
            }
        });
        location.replace('http://example.com/path');
        Backbone.history.start({
            pushState: true,
            hashChange: false
        });
        Backbone.history.navigate('');
    });

    QUnit.test('#2656 - No trailing slash on root.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: function (state, title, url) {
                    assert.strictEqual(url, '/root?x=1');
                }
            }
        });
        location.replace('http://example.com/root/path');
        Backbone.history.start({
            pushState: true,
            hashChange: false,
            root: 'root'
        });
        Backbone.history.navigate('?x=1');
    });

    QUnit.test('#2765 - Fragment matching sans query/hash.', function (assert) {
        assert.expect(2);
        Backbone.history.stop();
        Backbone.Router.injectedHistory = Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: function (state, title, url) {
                    assert.strictEqual(url, '/path?query#hash');
                }
            }
        });

        class MyRouter extends Backbone.Router
        {
            constructor()
            {
                super({
                    routes: {
                        path: function () {
                            assert.ok(true);
                        }
                    }
                });
            }
        }
        var myRouter = new MyRouter;

        location.replace('http://example.com/');
        Backbone.history.start({
            pushState: true,
            hashChange: false
        });
        Backbone.history.navigate('path?query#hash', true);
    });

    QUnit.test('Do not decode the search params.', function (assert) {
        assert.expect(1);
        class MyRouter extends Backbone.Router
        {
            constructor()
            {
                super({
                    routes: {
                        path: function (params) {
                            assert.strictEqual(params, 'x=y%3Fz');
                        }
                    }
                });
            }
        }
        var myRouter = new MyRouter;
        Backbone.history.navigate('path?x=y%3Fz', true);
    });

    QUnit.test('Navigate to a hash url.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        Backbone.Router.injectedHistory = Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        Backbone.history.start({
            pushState: true
        });
        class MyRouter extends Backbone.Router
        {
            constructor()
            {
                super({
                    routes: {
                        path: function (params) {
                            assert.strictEqual(params, 'x=y');
                        }
                    }
                });
            }
        }
        var myRouter = new MyRouter;
        location.replace('http://example.com/path?x=y#hash');
        Backbone.history.checkUrl();
    });

    QUnit.test('#navigate to a hash url.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        Backbone.Router.injectedHistory = Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        Backbone.history.start({
            pushState: true
        });
        class MyRouter extends Backbone.Router
        {
            constructor()
            {
                super({
                    routes: {
                        path: function (params) {
                            assert.strictEqual(params, 'x=y');
                        }
                    }
                });
            }
        }
        var myRouter = new MyRouter;
        Backbone.history.navigate('path?x=y#hash', true);
    });

    QUnit.test('unicode pathname', function (assert) {
        assert.expect(1);
        location.replace('http://example.com/myyj??');
        Backbone.history.stop();
        Backbone.Router.injectedHistory = Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        class MyRouter extends Backbone.Router
        {
            constructor()
            {
                super({
                    routes: {
                        myyj??: function () {
                            assert.ok(true);
                        }
                    }
                });
            }
        };
        new MyRouter;
        Backbone.history.start({
            pushState: true
        });
    });

    QUnit.test('unicode pathname with % in a parameter', function (assert) {
        assert.expect(1);
        location.replace('http://example.com/myyj??/foo%20%25%3F%2f%40%25%20bar');
        location.pathname = '/myyj%C3%A4/foo%20%25%3F%2f%40%25%20bar';
        Backbone.history.stop();
        Backbone.Router.injectedHistory = Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        class MyRouter extends Backbone.Router
        {
            constructor()
            {
                super({
                    routes: {
                        'myyj??/:query': function (query) {
                            assert.strictEqual(query, 'foo %?/@% bar');
                        }
                    }
                });
            }
        }
        new MyRouter;
        Backbone.history.start({
            pushState: true
        });
    });

    QUnit.test('newline in route', function (assert) {
        assert.expect(1);
        location.replace('http://example.com/stuff%0Anonsense?param=foo%0Abar');
        Backbone.history.stop();
        Backbone.Router.injectedHistory = Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        class MyRouter extends Backbone.Router
        {
            constructor()
            {
                super({
                    routes: {
                        'stuff\nnonsense': function () {
                            assert.ok(true);
                        }
                    }
                });
            }
        }
        new MyRouter;
        Backbone.history.start({
            pushState: true
        });
    });

    QUnit.test('Router#execute receives callback, args, name.', function (assert) {
        assert.expect(3);
        location.replace('http://example.com#foo/123/bar?x=y');
        Backbone.history.stop();
        Backbone.Router.injectedHistory = Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        class MyRouter extends Backbone.Router
        {
            constructor()
            {
                super({
                    routes: {
                        'foo/:id/bar': 'foo'
                    },
                });
            }

            foo() {}

            execute(callback, args, name) {
                assert.strictEqual(callback, this.foo);
                assert.deepEqual(args, ['123', 'x=y']);
                assert.strictEqual(name, 'foo');
            }
        }
        var myRouter = new MyRouter;
        Backbone.history.start();
    });

    QUnit.test('pushState to hashChange with only search params.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        location.replace('http://example.com?a=b');
        location.replace = function (url) {
            assert.strictEqual(url, '/#?a=b');
        };
        Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: null
        });
        Backbone.history.start({
            pushState: true
        });
    });

    QUnit.test('#3123 - History#navigate decodes before comparison.', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        location.replace('http://example.com/shop/search?keyword=short%20dress');
        Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: function () {
                    assert.ok(false);
                },
                replaceState: function () {
                    assert.ok(false);
                }
            }
        });
        Backbone.history.start({
            pushState: true
        });
        Backbone.history.navigate('shop/search?keyword=short%20dress', true);
        assert.strictEqual(Backbone.history.fragment, 'shop/search?keyword=short dress');
    });

    QUnit.test('#3175 - Urls in the params', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        location.replace('http://example.com#login?a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db');
        Backbone.Router.injectedHistory = Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        var myRouter = new Backbone.Router;
        myRouter.route('login', function (params) {
            assert.strictEqual(params, 'a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db');
        });
        Backbone.history.start();
    });

    QUnit.test('#3358 - pushState to hashChange transition with search params', function (assert) {
        assert.expect(1);
        Backbone.history.stop();
        location.replace('http://example.com/root?foo=bar');
        location.replace = function (url) {
            assert.strictEqual(url, '/root#?foo=bar');
        };
        Backbone.history = Object.assign(new Backbone.History, {
            location: location,
            history: {
                pushState: undefined,
                replaceState: undefined
            }
        });
        Backbone.history.start({
            root: '/root',
            pushState: true
        });
    });

    QUnit.test('Paths that don\'t match the root should not match no root', function (assert) {
        assert.expect(0);
        location.replace('http://example.com/foo');
        Backbone.history.stop();
        Backbone.Router.injectedHistory = Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        class MyRouter extends Backbone.Router
        {
            constructor()
            {
                super({
                    routes: {
                        foo: function () {
                            assert.ok(false, 'should not match unless root matches');
                        }
                    }
                });
            }
        }
        var myRouter = new MyRouter;
        Backbone.history.start({
            root: 'root',
            pushState: true
        });
    });

    QUnit.test('Paths that don\'t match the root should not match roots of the same length', function (assert) {
        assert.expect(0);
        location.replace('http://example.com/xxxx/foo');
        Backbone.history.stop();
        Backbone.Router.injectedHistory = Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        class MyRouter extends Backbone.Router
        {
            constructor()
            {
                super({
                    routes: {
                        foo: function () {
                            assert.ok(false, 'should not match unless root matches');
                        }
                    }
                });
            }
        }
        var myRouter = new MyRouter;
        Backbone.history.start({
            root: 'root',
            pushState: true
        });
    });

    QUnit.test('roots with regex characters', function (assert) {
        assert.expect(1);
        location.replace('http://example.com/x+y.z/foo');
        Backbone.history.stop();
        Backbone.Router.injectedHistory = Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        class MyRouter extends Backbone.Router
        {
            constructor()
            {
                super({
                    routes: {
                        foo: function () {
                            assert.ok(true);
                        }
                    }
                });
            }
        }
        var myRouter = new MyRouter;
        Backbone.history.start({
            root: 'x+y.z',
            pushState: true
        });
    });

    QUnit.test('roots with unicode characters', function (assert) {
        assert.expect(1);
        location.replace('http://example.com/??oo??/foo');
        Backbone.history.stop();
        Backbone.Router.injectedHistory = Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        class MyRouter extends Backbone.Router
        {
            constructor()
            {
                super({
                    routes: {
                        foo: function () {
                            assert.ok(true);
                        }
                    }
                });
            }
        }
        var myRouter = new MyRouter;
        Backbone.history.start({
            root: '??oo??',
            pushState: true
        });
    });

    QUnit.test('roots without slash', function (assert) {
        assert.expect(1);
        location.replace('http://example.com/??oo??');
        Backbone.history.stop();
        Backbone.Router.injectedHistory = Backbone.history = Object.assign(new Backbone.History, {
            location: location
        });
        class MyRouter extends Backbone.Router
        {
            constructor()
            {
                super({
                    routes: {
                        '': function () {
                            assert.ok(true);
                        }
                    }
                });
            }
        }
        var myRouter = new MyRouter;
        Backbone.history.start({
            root: '??oo??',
            pushState: true
        });
    });

    QUnit.test('#4025 - navigate updates URL hash as is', function (assert) {
        assert.expect(1);
        var route = 'search/has%20space';
        Backbone.history.navigate(route);
        assert.strictEqual(location.hash, '#' + route);
    });

})(QUnit);