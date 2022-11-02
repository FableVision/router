(function (QUnit) {
    var history = window.history;
    var pushState = history.pushState;
    var replaceState = history.replaceState;

    QUnit.config.noglobals = true;

    QUnit.testStart(function () {
        // We never want to actually call these during tests.
        history.pushState = history.replaceState = function () {};

    });

    QUnit.testDone(function () {
        history.pushState = pushState;
        history.replaceState = replaceState;
    });

})(QUnit);