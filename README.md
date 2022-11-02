# Router/History for single page apps
A modified version of [Backbone's Router](https://github.com/jashkenas/backbone) with the following changes:

* No JQuery/Underscore dependencies.
* Updated to ES6 code/classes (no more Router.extend()).
* Dropped support for Internet Explorer
* Dropped "route: <route name>" events and moved event emission to `Router.routeEvent`.