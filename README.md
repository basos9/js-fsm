js-fsm
======

JavaScript based FSM.  
A state based Finite State Machine for javascript.

Features
--------

 - State based FSM description. A state composed of a <stateName> and an array of state transitions.
 - Transition from events. Multiple events define ORed events.
 - Transition from conditions. A condition is a key: value pair that should match on the condition object. Multiple key, value pairs defined ANDed conditions. Multiple conditions define ORed conditions
 - Each transition can optionally call actions or multiple actions. Actions can optionally have arguments or be members of this.
 - State machine could be mixed (as a mixin) to an existing object or a constructor's prototype. A method for this is provided.
 - State machine can optionally log if a log method exists on `this` or is provided.
 - AMD and Node modules are supported.
 - Unit tests with QUnit.


API
---
The StateMachine is registered as an AMD module if available or a Node module if available or as a window global if available.  
In any case, a ref to StateMachine constructor should be first taken.

**new StateMachine(states, OPT logFunc)**  
**Constructor**  
* Param: states: statesSpec object as defined below.
* Param: logFunc: OPT a logging function that accepts one argument, a string, to log to. Default to no logging.
* Returns: a stateMachine object


#### Static Members

**StateMachine.mixin(obj)**  
Mix statemachine functionality to an existing object or prototype.  
**NOTE**: In this case the stmInit(states, OPT logFunc) member function should be called to initialize the stateMachine. All public methods are `stm` prefixed and all private methods or attributes are `_stm` prefixed.
* Param: obj, an object to ammend (mixin) with stateMachine functionality.  


**StateMachine.GLOB**  
A shortcut for the glob string used at cond values or keys. For cond keys to be syntacically correct you need to use the literal value of GLOG which is "\_\_STMGLOB\_\_"

#### Object Members

**this.stmOnEvent(eventName)**  
Transition to a state if applicable.
* Param: eventName an event name

**this.stmOnCondition(cond)**  
Transition to a state if applicable.
* Param: cond, a conditions object.

**this.stmGetStatus()**  
Get the current state name.
* Return String. current state name. 
NOTE: Type is string even if stateId is Number or other type. Use loose equal operator (==).

 
States Spec
-----------

    stateSpec::
    {
      <stateName>: [ 
        <stTransition>, 
        ...
      ],
      ....
      initial: <initStateName>
    }
  
    stTransition:: 
      <stTransitionCondition> || <stTransitionEvent>
    
    stTransitionConditionSpec::
      { 
        cond: <cond> || [ <cond>,.. ],
        to: <stName>, 
        OPT action: <actMult>
      }
      NOTE: When `cond` is an array, condSpecs are ORed
    
    
    stTransitionEventSpec::
      {
        event: <evtName> || [<evtName>,...],
        to: <stName>, 
        opt action: <actMult>
      }
      NOTE: When `event` is an array, evtNames are ORed
    
    actMultSpec::
      <act> || [ <act>, ...]
      NOTE: When actSpecMult is an array, actSpecs are called in order
    
    actSpec::
      <func> || { f: <func>, a: argsAr || argOne} ]
      NOTE: A function to be called with this as ctx.
      NOTE: When providing args the `a` member can be an array (of arguments to apply) or any other type to denote a single argument.
    
    funcSpec::
      <functionRef> || <methodNameOfThis>
      NOTE: When <funcSpec> is string it refers to a method of this (this.<methodNameOfThis>)
      
    condSpec::
     { 
       <key>: <value>, 
       ...
     } 
     NOTE: conditions to be ANDed checked with data object, strict, depth 1
     NOTE: `value` can be StateMachine.GLOB, to match any value
     NOTE: `key` can be StateMachine.GLOB, to mach any keys. To define an condSpec literal use the actual value of StateMachine.GLOB = "__STMGLOB__"



  



EXAMPLE
-------
    var GLOB = StateMachine.GLOB;

    var states = {
      'init': [
        {cond: {status: 1}, to: 'upda', action: show},
        {cond: {status: 2}, to: 'upda'},
        {cond: {status: 3}, to: 'upda', action: {f: show, a: "john"}},
        {cond: {status: 4}, to: 'upda', action: {f: show, a: ["john"]}},
        {cond: {status: 5}, to: 'upda', action: [{f: show, a: "john"}, {f: show, a: "lennon"}]},
        // USE GLOB literal to denote ANY key, value does not matter
        {cond: {others: 6, __STMGLOB__: 0}, to: 'upda'},
        {event: "john", to: 'upda'}
      ],

      'upda': [
        {cond: {trig: 7,  lek: 15},    to: 'updb'},
        {cond: {trig: 10, lek: GLOB},  to: 'init'},
        {cond: {status: 20},           to: 'upda', action: show},
        {cond: {status: GLOB},         to: 'updb'},
        // THIS is not masked by GLOB above
        {cond: {status: 30},           to: 'init'}
      ],

      'updb': [
        // ORed conditions 
        {cond: [{status: 1}, {status: 2}], to: 'upda'},
        // ORed events
        {event: ["land", "lond"],          to: 'upda'},
        {event: "rst",                     to: "init"}
      ],

      'initial': 'init'

    };
    
    var sm = new StateMachine(states);


