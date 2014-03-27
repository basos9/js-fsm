(function() {

    function log(a){
      console && console.log(a);
    }

    function show(){
      console.log("SHOW: ");
      // ok(true, "Action called");
      show.call = true;
      show.arg = Array.prototype.slice.call(arguments,0);
    }

    show.reset = function(){
      show.call = false;
      show.arg = void 0;
    }

    show.reset();

    var states = {};
    var memTans = {cond: {status: 5}, to: 'upda', action: ["sjohn", "john"]};
    states['init'] = [

      {cond: {status: 1}, to: 'upda', action: show},
      {cond: {status: 2}, to: 'upda'},
      {cond: {status: 3}, to: 'upda', action: [show, "john"]},
      {cond: {status: 4}, to: 'upda', action: [show, ["john"]]},
      // memTans

      {event: "john", to: 'upda'}
    ];

    states['updb'] = [
      {cond: [{status: 1}, {status: 2}], to: 'upda'},
      {event: ["land", "lond"], to: 'upda'},
      {event: "rst", to: "init"}
    ];
    states['upda'] = [
      {cond: {trig: 7, lek: 15}, to: 'updb'},
      {cond: {trig: 10, lek: '*'}, to: 'init'},
      // WARNING when glob in one argument and other cases
      {cond: {status: '*'}, to: 'updb'}

    ];
    states['initial'] = 'init';





    module("StateMachine");

    test("Conditional state transitions", function(){
      var sm = new StateMachine(states);
      sm.log = log;
      strictEqual(sm.stmGetStatus(), 'init', "Intial State should be init");
      sm.stmOnCondition({status: 8});
      strictEqual(sm.stmGetStatus(), 'init', 'Does not switch when condition not found');
      sm.stmOnCondition({status: 1});
      strictEqual(sm.stmGetStatus(), 'upda', 'Switch from one simple condition');
      sm.stmOnCondition({status: 1});
      strictEqual(sm.stmGetStatus(), 'updb', 'Switch from one glob condition');
      sm.stmOnCondition({status: 8});
      strictEqual(sm.stmGetStatus(), 'updb', 'Does not switch when condition not found ORed');
      sm.stmOnCondition({status: 2});
      strictEqual(sm.stmGetStatus(), 'upda', 'Switch from one ORed condition');
      sm.stmOnCondition({status: 1});
      strictEqual(sm.stmGetStatus(), 'updb', "Prepare state");
      sm.stmOnCondition({status: 1});
      strictEqual(sm.stmGetStatus(), 'upda', 'Switch from one ORed condition');
      sm.stmOnCondition({lek: 5});
      strictEqual(sm.stmGetStatus(), 'upda',  'Does not switch when cond not found ANDed');
      sm.stmOnCondition({trig: 7, lek: 5});
      strictEqual(sm.stmGetStatus(), 'upda',  'Does not switch when cond not found ANDed');
      sm.stmOnCondition({trig: 7, lek: 15});
      strictEqual(sm.stmGetStatus(), 'updb', 'Switch from ANDed cond');
      sm.stmOnEvent("land");
      strictEqual(sm.stmGetStatus(), 'upda', "Prepare state");
      sm.stmOnCondition({trig: 10, lek: 18});
      strictEqual(sm.stmGetStatus(), 'init', 'Switch from ANDed cond with glob');
    });

    test("Event state transitions", function(){
      var sm = new StateMachine(states);     sm.log = log;
      sm.stmOnEvent("john");
      strictEqual(sm.stmGetStatus(), 'upda', 'Switch from event');
      sm.stmOnCondition({status: 7});
      strictEqual(sm.stmGetStatus(), 'updb', 'Prepare state');
      sm.stmOnEvent("lala");
      strictEqual(sm.stmGetStatus(), 'updb', 'Does not switch from nx event ORed');
      sm.stmOnEvent("lond");
      strictEqual(sm.stmGetStatus(), 'upda', 'Switches from event ORed');
    });

    test("Actions on cond state transitions", function(){
      var sm = new StateMachine(states);
      show.reset();
      strictEqual(show.call, false, "Func ok");
      sm.stmOnCondition({status: 1});
      strictEqual(sm.stmGetStatus(), 'upda', 'Status OK');
      ok(show.call, "Action called");
      equal(show.arg.length, 0, "Action args not passed");
    });

    test("Actions with args on cond state transitions", function(){
      var sm = new StateMachine(states);
      show.reset();
      sm.stmOnCondition({status: 3});
      strictEqual(sm.stmGetStatus(), 'upda', 'Status OK');
      equal(show.call, true, "Action called");
      equal(show.arg.length, 1, "Action args one passed");
      equal(show.arg[0], "john", "Action args one value ok");

      var sm = new StateMachine(states);
      show.reset();
      sm.stmOnCondition({status: 4});
      ok(show.call, "Action called");
      equal(show.arg.length, 1, "Action args array passed");
      equal(show.arg[0], "john", "Action args array value ok");
    });


    module("STM Mixin");

    var xstates = Object.create(states);
    xstates['init'] = states['init'].slice(0),
    xstates['init'].push(memTans);

    var K = function K() {
      this.stmInit(xstates);
    }

    K.prototype.sjohn = show;
    StateMachine.mixin(K.prototype);
    console.log("m");

    test("Mixin tests", function() {
      var m = new K();
      m.log=log;
      m.stmOnEvent("john");
      strictEqual(m.stmGetStatus(), 'upda', "Switch from event simple");
      m.stmOnCondition({status: 5});
      strictEqual(m.stmGetStatus(), 'updb', "Switch from one glob condition");
      m.stmOnCondition({status: 555});
      strictEqual(m.stmGetStatus(), 'updb', "Does not switch from nx ORed condition");
      m.stmOnCondition({status: 1});
      strictEqual(m.stmGetStatus(), 'upda', "Switch from one ORed condition");
      m.stmOnCondition({trig: 11, lek: 11});
      strictEqual(m.stmGetStatus(), 'upda', 'Does not switch from nx ANDend');
      m.stmOnCondition({trig: 10, lek: 11});
      strictEqual(m.stmGetStatus(), 'init', 'Switch from ANDed with glob');
    });

    test("Member action not exists error", function() {
      throws(function() {
        var sm = new StateMachine(xstates);
      }, "Throws error");
    });

    test("Mixin actions", function() {
      var m = new K();
      show.reset();
      m.stmOnCondition({status: 5});
      strictEqual(m.stmGetStatus(), 'upda', 'Status OK');
      equal(show.call, true, "Action called");
      equal(show.arg.length, 1, "Action args one passed");
      equal(show.arg[0], "john", "Action args array value ok");
    });

})();
