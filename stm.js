/**
 * StateMachine with event and conditional transitions
 *
 * statesSpec:
 *  {<stName>: [<stTransition*>, ...], ...}
 * stTransition in stTransitionCondition, stTransitionEvent
 * actSpec = func || [func, argsAr], to be called with this as ctx
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
  function StateMachine(states, initial){
    this.stmInit(states, initial);
  }

  StateMachine.mixin = function(classe) {
    for (var i in StateMachine.prototype) {
      if (! this.prototype.hasOwnProperty(i))
        continue;
      classe[i] = this.prototype[i];
    }
  };

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

  StateMachine.prototype = {
    stmInit: function (states) {
      var initial,
        i, e, j, f, k, z, n;
      this.log = this.log || function(){};

      this.states = states;

      for (i in states) {
          if (i === 'initial') {
            initial = states[i];
            continue;
          }
          e = states[i]; // state def (array of transitions)
          if (!e._events) e._events = {};
          e._name = i;
          for (j=e.length; j--; ){
            f = e[j];
            if (!f.to) throw new Error("Missing to member");
            if (!states[f.to]) throw new Error("State not defined "+f.to);
            if ( (z = f.event)) {
              // event transition from this state
              if (StateMachine.isArray(z)) {
                for (k=z.length; k--; ) {
                  e._events[z[k]] = f;
                }
              }
              else {
                e._events[z] = f;
              }
              e.splice(j, 1); // splice ok on reverse read array
            }
            else if ((z = f.cond)) {
              if (StateMachine.isArray(z)) {
                for (k=z.length; k--; ) {
                  n = StateMachine.create(f); // clone proto
                  n.cond = z[k]; // mask cond
                  e.push(n); // append ok on reverse read array
                }
                // delete ref to original cond array
                // member objects of this array are still referenced by n objects above with cond property masked
                e.splice(j, 1); // splice ok on reverse read array
              }
            }
          }
      }

      if (! initial || ! initial in states)
        throw new Error("initial state ("+initial+")not defined");

      this.currentState = states[initial];

    },

    _stmAction: function(f) {
      if (StateMachine.isArray(f))
        return f[0].apply(this. f[1] || []);
      else if (f)
        return f.apply(this);
    },

    stmOnEvent: function(e){
      var state = this.currentState,
        f;
      if( (f = state._events[e])){
        this.log("stmOnEvent() > switching to "+f.to+", e: "+e+", from:"+state._name+", action:"+!!f.action);
        this.currentState = this.states[f.to] ;
        this._stmAction(f.action);
      }
      else {
        this.log("stmOnEvent() no switch e: "+e+", from:"+state._name);
      }

    },

    stmOnCondition: function(d){
      var state = this.currentState,
          j, f, k, z, has;
       for (j=state.length; j--; ){
         f = state[j];
         if (z = f.cond) {
           has = true;
           for (k in z) {
             if (!(has = has &&
               (k in d && (z[k] === '*' || z[k] === d[k]))))
               break;
           }
           if (has) {
             this.log("stmOnCondition() > switching to "+f.to+", d: "+(JSON && JSON.stringify(d))+", from:"+state._name+", action:"+!!f.action);
             this.currentState = this.states[f.to];
             this._stmAction(f.action);
             break;
           }
         }
       }
       if (!has) {
         this.log("stmOnCondition() no switch d: "+(JSON && JSON.stringify(d))+", from:"+state._name);
       }
    },

    stmGetStatus: function(){
      return this.currentState._name;
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


