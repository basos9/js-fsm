/**
 * StateMachine with event and conditional transitions
 *
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
 * e.g.
 * states['init'] = [
 *       {cond: {status: 1}, to: 'upda', action: show},
 *       {event: "john", to: 'upda'}
 * ];
 */

(function ModSTM() {

  var ver = '0.9'

  /**
   * Constructor
   * @see this.initStm for parameters
   */
  function StateMachine(){
    this.stmInit.apply(this, arguments);
  }

  /**
   * Mix the sta functionality (protytype) to the given object. All statemachine
   * attribs/methods are stm or _stm prefixed
   * @param classe object or function's prototype to extend
   */
  StateMachine.mixin = function(classe) {
    for (var i in StateMachine.prototype) {
      if (! this.prototype.hasOwnProperty(i))
        continue;
      classe[i] = this.prototype[i];
    }
  };

  /**
   * Reference to the glob string literal.
   */
  StateMachine.GLOB =  '__STMGLOB__';

  /**
   * isArray shim or Array.isArray if defined, used internally
   * @param value mixed
   * @returns {Boolean}
   */
  StateMachine._isArray = typeof Array.isArray !== 'undefined' ? Array.isArray :
    function(value) {
      return value != null && Object.prototype.toString.call(value) === '[object Array]'; // undef or null
    }; // end Array.isArray

  /**
   * Object create shim or Object.create if defined, used internally
   * Creates a prototype clone of the source object
   * @param o source Object
   * @return Object a new object
   */
  StateMachine._create = typeof Object.create !== 'undefined' ? Object.create :
    function(o) {
      var Func;
      Func = function() {};
      Func.prototype = o;
      return new Func();
    };

  /**
   * Object.keys() shim or Object.keys if defined, used internally
   * @param o Object
   * @return array of Object's keys
   */
  StateMachine._keys = typeof Object.keys !== 'undefined' ? Object.keys :
    function (o) {
      var i,
        keys = [],
        hasOwnProperty = Object.prototype.hasOwnProperty;

      if (typeof o !== 'object' && typeof o !== 'function' || o === null) throw new TypeError('Object.keys called on non-object');
      for(i in o) {
        if (hasOwnProperty.call(o,i)) keys.push(i);
      }
      return keys;
    }; // end function Object.keys


  StateMachine.prototype = {
    /**
     * Intialize state machine, called from constructor.
     * Call it manually when stm is mixed in an existing object
     * @param statesDef object of states definitions, @see documentation
     * @log OPT function(a) that logs to the console.
     */
    stmInit: function (statesDef, log) {
      var initial, i, e, j, f, k, z, n, t,
        // Create new states object (we will mutate some things)
        states = this._stmStates = {},
        c = 0;

      function ammendCondCont(f) {
        var z = f.cond,
          GLOB = StateMachine.GLOB,
          globKeys = GLOB in z,
          d, i;
        if (globKeys) {
          // copy object, skip glob
           d = z;
           f.cond = z = {};
           for (i in d)
             if (i !== GLOB)
               z[i] = d[i];
           // f.cond = z = StateMachine.create(z); //clone
           // z[StateMachine.GLOB] = undefined; // mask glob
        }
        f._stmCondLen = StateMachine._keys(z).length;
        f._stmCondGlobKeys = globKeys;
      }

      this.log = log || this.log || function(){};

      for (i in statesDef) {
          if (i === 'initial') {
            initial = statesDef[i];
            continue;
          }
          e = statesDef[i];
          t = states[i] = []; // state def (array of transitions)
          t._stmEvents = {}; // events prop
          t._stmName = i; // name prop
          for (j=e.length; j--; ){
            f = e[j];
            if (!f.to) throw new Error("Missing 'to' member");
            if (!statesDef[f.to]) throw new Error("State not defined "+f.to);
            this._stmAction(f.action, true); // dry run
            if ( (z = f.event)) {
              // event transition from this state
              if (StateMachine._isArray(z)) {
                for (k=z.length; k--; ) {
                  t._stmEvents[z[k]] = f;
                }
              }
              else {
                t._stmEvents[z] = f;
              }
              //DONT MODIFY ORIGINAL e.splice(j, 1); // splice ok on reverse read array
            }
            else if ((z = f.cond)) {
              if (StateMachine._isArray(z)) {
                for (k=z.length; k--; ) {
                  n = StateMachine._create(f); // clone proto
                  n.cond = z[k]; // mask cond
                  ammendCondCont(n);
                  //DONT MOD ORIGINAL e.push(n); //  append ok on reverse read array
                  t.push(n);
                }
                // delete ref to original cond array
                // member objects of this array are still referenced by n objects above with cond property masked
                // DONT MOD ORIGINAL e.splice(j, 1); // splice ok on reverse read array
              }
              else {
                n = StateMachine._create(f);
                ammendCondCont(f);
                t.push(f);
              }
            }
          }
          c++;
      }

      if (! initial || ! initial in states)
        throw new Error("initial state ("+initial+") not defined");

      this._stmCurrentState = states[initial];

      this.log("stmInit(), initialized, v: "+ver+", init state: "+initial+", nStates: "+c);
    },

    /**
     * Trigger an event transition (if applicable)
     * @param e string an event name
     */
    stmOnEvent: function(e){
      var state = this._stmCurrentState,
        f;
      if( (f = state._stmEvents[e])){
        this.log("stmOnEvent() > switching to: "+f.to+", e: "+e+", from: "+state._stmName+", action: "+!!f.action);
        this._stmCurrentState = this._stmStates[f.to] ;
        this._stmAction(f.action);
      }
      else {
        this.log("stmOnEvent() no switch evt e: "+e+", from: "+state._stmName);
      }
    },

    /**
     * Trigger a condition based transition (if applicable)
     * @param d Object condition object, @see documentation
     */
    stmOnCondition: function(d){
      var state = this._stmCurrentState,
          GLOB = StateMachine.GLOB,
          j, f, k, z, has, scanGlob, hasGlob;
       if (d !== null && typeof d === 'object') {
         scanGlob = true;
         hasGlob = false;
         for (j=state.length; j--; ){
           f = state[j];
           if (z = f.cond) {
             has = true;
             for (k in z) {
               if (!(has = has && // previous attrs should be ok (not appc due to break but does not bother)
                 (k in d && // attr exists in data
                  ( ( ( z[k] === GLOB ? scanGlob && !!(hasGlob = f) : // value is glob and scanGlob is true (then save matched, always truthy)
                        z[k] === d[k])))))) // OR value is not glob and value matches data
                 break;
             }
             // if matched and globKeys not specifies, lengths should match (since all condSpec attrs matched
             //  if lengths also match (minus glob in condspec) this means that both objects have the same attrs
             has = has && ( f._stmCondGlobKeys ||
                StateMachine._keys(d).length === f._stmCondLen);
             if (has) {
               if (hasGlob) {
                 // found with a glob, defer until all other non globs searched
                 scanGlob = false;
               }
               else {
                 // switch state
                 break;
               }
             }
             else if (scanGlob) {
               // cond does not match, if we scaned for glob reset hasGlob
               hasGlob = false;
             }
           }
         } // for state
         // if last entry found or a previous glob was found
         if (has || (f = has = hasGlob)) {
           this.log("stmOnCondition() > switching to: "+f.to+", d: "+(typeof JSON !== 'undefined' && JSON.stringify(d))+", from: "+state._stmName+", action: "+!!f.action);
           this._stmCurrentState = this._stmStates[f.to];
           this._stmAction(f.action);
         }
       } // if
       if (!has) {
         this.log("stmOnCondition() no switch cond d: "+(typeof JSON !== 'undefined' && JSON.stringify(d))+", from: "+state._stmName);
       }
    },

    /**
     * @return string current state's name
     */
    stmGetStatus: function(){
      return this._stmCurrentState._stmName;
    },

    /**
     * PRIVATE
     * Check call a transition action
     */
    _stmAction: function(fn, dry) {
      var args;
      if (StateMachine._isArray(fn)) {
        for (var i=0, l=fn.length; i<l; i++) {
          this._stmAction(fn[i], dry);
        }
        return;
      }
      else if (typeof(fn) === 'object' && fn !== null) {
        args = StateMachine._isArray(fn.a) ? fn.a : [fn.a];
        fn = fn.f;
      }
      if (fn) {
        if (typeof fn === 'string') fn = this[fn];
        if (fn === undefined)
          throw new Error("Action function not defined or not member of this");
        if (!dry)
          fn.apply(this, args);
      }
    }
  };



  //============
  // AMD/REQUIRE
  //============
  if (typeof define === 'function' && define.amd) {
    define(function() { return StateMachine; });
  }
  //======
  // NODE
  //======
  else if (typeof module !== 'undefined' && module.exports !== undefined) {
    module.exports = StateMachine;
  else if (typeof exports !== 'undefined') {
    exports.StateMachine = StateMachine;
  }
  //========
  // BROWSER
  //========
  else if (window) {
    window.StateMachine = StateMachine;
  }

})();
