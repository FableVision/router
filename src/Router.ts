import { history } from './History';

export interface RouterOptions
{
    routes?: RoutesHash;
}

interface NavigateOptions
{
    trigger?: boolean;
    replace?: boolean;
}

interface RoutesHash
{
    [routePattern: string]: { (...urlParts: string[]): void };
}

// Cached regular expressions for matching named param parts and splatted
// parts of route strings.
const optionalParam = /\((.*?)\)/g;
const namedParam = /(\(\?)?:\w+/g;
const splatParam = /\*\w+/g;
const escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;

/**
 *  Routers map faux-URLs to actions, and fire events when routes are
 * matched. Creating a new one sets its `routes` hash, if not set statically.
 */
export class Router
{
    /**
    * Routes hash or a method returning the routes hash that maps URLs with parameters to methods on your Router.
    * For assigning routes as object hash, do it like this: this.routes = <any>{ "route": callback, ... };
    * That works only if you set it in the constructor or the initialize method.
    **/
    routes: RoutesHash;

    constructor(options?: RouterOptions)
    {
        this.routes = {};
        options || (options = {});
        this.preinitialize(options);
        if (options.routes) this.routes = options.routes;
        this._bindRoutes();
        this.initialize(options);
    }

    /**
     * For use with Router as ES classes. If you define a preinitialize method,
     * it will be invoked when the Router is first created, before any
     * instantiation logic is run for the Router.
     * @see https://backbonejs.org/#Router-preinitialize
     */
    preinitialize(options?: RouterOptions): void
    {
    }

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize(options?: RouterOptions): void
    {
    }

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route(route: string|RegExp, name: string, callback: Function): Router;
    route(route: string|RegExp, callback: Function): Router;
    route(route: string|RegExp, name: string|Function, callback?: Function): Router
    {
        if (typeof route == 'string') route = this._routeToRegExp(route);
        if (typeof name !== 'string')
        {
            callback = name;
            name = '';
        }
        history.route(route, (fragment) =>
        {
            var args = this._extractParameters(route as RegExp, fragment);
            this.execute(callback!, args, name as string);
        });
        return this;
    }

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate(fragment: string, options?: NavigateOptions): Router;
    navigate(fragment: string, trigger?: boolean): Router;
    navigate(fragment: string, options?: NavigateOptions|boolean)
    {
        history.navigate(fragment, options);
        return this;
    }

    // Execute a route handler with the provided parameters.  This is an
    // excellent place to do pre-route setup or post-route cleanup.
    execute(callback: Function, args: any[], name: string): void
    {
        if (callback) callback.apply(this, args);
    }

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    private _bindRoutes(): void
    {
        if (!this.routes) return;
        let route;
        let routes = Object.keys(this.routes);
        while ((route = routes.pop()) != null)
        {
            this.route(route, this.routes[route]);
        }
    }

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    private _routeToRegExp(route: string): RegExp
    {
        route = route.replace(escapeRegExp, '\\$&')
            .replace(optionalParam, '(?:$1)?')
            .replace(namedParam, function (match, optional)
            {
                return optional ? match : '([^/?]+)';
            })
            .replace(splatParam, '([^?]*?)');
        return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    }

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    private _extractParameters(route: RegExp, fragment: string): string[]
    {
        const params = (route.exec(fragment) || [fragment]).slice(1);
        return params.map(function (param, i)
        {
            // Don't decode the search params.
            if (i === params.length - 1) return param || null;
            return param ? decodeURIComponent(param) : null;
        }) as string[];
    }
}