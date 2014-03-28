/**
 * StateMachine with event and conditional transitions
 *
 * statesSpec:
 *  {<stName>: [<stTransition*>, ...], ...}
 * stTransition in stTransitionCondition, stTransitionEvent
 * actSpec = func || {f: func, a: argsAr || argOne} ], to be called with this as ctx
 * condSpec = {key: value, ...} conditions to be ANDed checked with data object, strict, depth 1
 * cond could be an array, with conditions ORed
 * stTransitionConditionSpec:
 *  {cond: <condSpec> || [<condSpec>,..] , to: <stName>, opt action: <actSpec>}
 * event could be an array of events ORed
 * stTransitionEventSpec:
 *  {event: <evtName> || [<evtName>,...], to: <stName>, opt action: <actSpec>}
 * e.g.
 * states['init'] = [
 *       {cond: {status: 1}, to: 'upda', action: show},
 *       {event: "john", to: 'upda'}
 * ];
 */

(function ModSTM() {
  function StateMachine(){
    this.stmInit.apply(this, arguments);
  }

  StateMachine.mixin = function(classe) {
    for (var i in StateMachine.prototype) {
      if (! this.prototype.hasOwnProperty(i))
        continue;
      classe[i] = this.prototype[i];
    }
  };

  StateMachine.GLOB =  '__STMGLOB__';

   /**
   * isArray shim
   * @param value mixed
   * @returns {Boolean}
   */
  StateMachine.isArray = typeof Array.isArray !== 'undefined' ? Array.isArray :
    function(value) {
      return value != null && Object.prototype.toString.call(value) === '[object Array]'; // undef or null
    }; // end Array.isArray

  /**
   * Object create shim
   * Creates a prototype clone of the source object
   * @param o source Object
   * @return Object a new object
   */
  StateMachine.create = typeof Object.create !== 'undefined' ? Object.create :
    function(o) {
      var Func;
      Func = function() {};
      Func.prototype = o;
      return new Func();
    };

  /**
   * Object.keys() shim
   * Get an array of an Object's keys
   */
  StateMachine.keys = typeof Object.keys !== 'undefined' ? Object.keys :
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

    stmInit: function (statesDef, log) {
      var initial, i, e, j, f, k, z, n, t,
        // Create new states object (we will mutate some things)
        states = this.states = {},
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
        f._stmCondLen = StateMachine.keys(z).length;
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
              if (StateMachine.isArray(z)) {
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
              if (StateMachine.isArray(z)) {
                for (k=z.length; k--; ) {
                  n = StateMachine.create(f); // clone proto
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
                n = StateMachine.create(f);
                ammendCondCont(f);
                t.push(f);
              }
            }
          }
          c++;
      }

      if (! initial || ! initial in states)
        throw new Error("initial state ("+initial+") not defined");

      this.currentState = states[initial];

      this.log("stmInit(), initialized, state: "+initial+", nStates: "+c);
    },

    _stmAction: function(fn, dry) {
      var args;
      if (StateMachine.isArray(fn)) {
        for (var i=0, l=fn.length; i<l; i++) {
          this._stmAction(fn[i], dry);
        }
        return;
      }
      else if (typeof(fn) === 'object' && fn !== null) {
        args = StateMachine.isArray(fn.a) ? fn.a : [fn.a];
        fn = fn.f;
      }
      if (fn) {
        if (typeof fn === 'string') fn = this[fn];
        if (fn === undefined)
          throw new Error("Action function not defined or not member of this");
        if (!dry)
          fn.apply(this, args);
      }
    },

    stmOnEvent: function(e){
      var state = this.currentState,
        f;
      if( (f = state._stmEvents[e])){
        this.log("stmOnEvent() > switching to: "+f.to+", e: "+e+", from: "+state._stmName+", action: "+!!f.action);
        this.currentState = this.states[f.to] ;
        this._stmAction(f.action);
      }
      else {
        this.log("stmOnEvent() no switch evt e: "+e+", from: "+state._stmName);
      }

    },

    stmOnCondition: function(d){
      var state = this.currentState,
          GLOB = StateMachine.GLOB,
          j, f, k, z, has;
       if (d !== null && typeof d === 'object')
         for (j=state.length; j--; ){
           f = state[j];
           if (z = f.cond) {
             has = true;
             for (k in z) {
               if (!(has = has &&
                 (k in d && (z[k] === GLOB || z[k] === d[k]))))
                 break;
             }
             // if matched and globKeys not specifies, lengths should match (since all condSpec attrs matched
             //  if lengths also match (minus glob in condspec) this means that both objects have the same attrs
             has = has && ( f._stmCondGlobKeys ||
                StateMachine.keys(d).length === f._stmCondLen);
             if (has) {
               this.log("stmOnCondition() > switching to: "+f.to+", d: "+(typeof JSON !== 'undefined' && JSON.stringify(d))+", from: "+state._stmName+", action: "+!!f.action);
               this.currentState = this.states[f.to];
               this._stmAction(f.action);
               break;
             }
           }
         }
       if (!has) {
         this.log("stmOnCondition() no switch cond d: "+(typeof JSON !== 'undefined' && JSON.stringify(d))+", from: "+state._stmName);
       }
    },

    stmGetStatus: function(){
      return this.currentState._stmName;
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
  else if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = StateMachine;
    }
    // exports.StateMachine = StateMachine;
  }
  //========
  // BROWSER
  //========
  else if (window) {
    window.StateMachine = StateMachine;
  }

})();


