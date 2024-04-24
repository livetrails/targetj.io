function TUtil() {}

TUtil.allTModelOptions = {
    'canHaveDom': true,
    'loopTargets': true,
    'isDomDeletable': true,
    'initWidthFromDom': true,
    'initHeightFromDom': true
};

TUtil.getTypeFromCallerFile = function() {
    var stack = new Error("PRINTING CALL STACK").stack;
    var lines = stack.split("\n");
    var index = lines.findIndex(function(s) { return s.indexOf("TModel") >= 0; });
    var typeLine = index < lines.length - 1 ? lines[index + 1] : '';
        
    var type = typeLine.match(/[a-zA-Z]{3,}/);
                
    return TUtil.isDefined(type) ? type[0] : '';
};

TUtil.isArgumentOptions = function(a) {
    
    var result = false;
    if (typeof a === 'object') {
        var keys = Object.keys(a);
        result = keys.length > 0 && TUtil.allTModelOptions[keys[0]];
    }
    
    return result;
};

TUtil.initDoms = function(visibleList) {
    
    var elements = $Dom.findByClass('tgt'); 
        
    visibleList.forEach(function(tmodel) {
        tmodel.$dom = null;
    });
    
    var visibleMap = TUtil.list2map(visibleList.filter(function(item) { return item.type !== 'BI'; }));
    
    for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        
        var id = element.getAttribute("id");

        var tmodel = visibleMap[id];
                        
        if (tmodel && !tmodel.hasDom()) {
            tmodel.$dom = new $Dom("#" + id);
        } else {
            $Dom.detach(element);
        }
    }   
};

TUtil.list2map = function(list, defaultValue) {
    var map = list.reduce(function(a, c){
        a[c.oid] = TUtil.isDefined(defaultValue) ? defaultValue : c;
        return a;
    }, {});
    
    return map;
};

TUtil.getDeepList = function(parent)   {
    var deepList = []; 
    
    function traverse(tmodel) {
        if (tmodel.hasChildren())  {
            var list = tmodel.getChildren();
            deepList = deepList.concat(list);
            list.forEach(function(t) {
                traverse(t);
            });            
        }
    }
    
    traverse(parent);
    return deepList;
};

TUtil.getDeepUpdatingList = function(parent)   {
    var deepList = []; 
    
    function traverse(tmodel) {
        if (tmodel.updatingChildren)  {
            deepList = deepList.concat(tmodel.updatingChildren);
            tmodel.updatingChildren.forEach(function(t) {
                traverse(t);
            });            
        }
    }
    
    traverse(parent);
    
    return deepList;
};

TUtil.areEqual = function(a, b, deepEquality) {

    if (deepEquality) {        
        return JSON.stringify(a) === JSON.stringify(b);     
    } else if (TUtil.isDefined(a) && TUtil.isDefined(b)) {
        return a === b;
    } else {
        return false;
    }
};

TUtil.momentum = function (past, current, time) {
    time = time || 1;

    var distance = current - past;
    var speed = Math.abs(distance) / time;
    var duration = speed * 5000;
    var initialVelocity = 100;
    var momentum = initialVelocity * duration;
    
    var momentumDistance = momentum / 10;
    if (distance > 0) {
      distance += momentumDistance;
    } else {
      distance -= momentumDistance;
    }    
    
    return {distance: Math.round(distance) / 50, duration: duration, momentumDistance: momentumDistance, time: time * 5 };
};

TUtil.isDefined = function (obj) {
    return typeof (obj) !== "undefined" && obj !== null;
};

TUtil.isNumber = function(num) {
    return typeof num === 'number' && !isNaN(num);
};

TUtil.limit = function (num, low, high) {
    num = !TUtil.isDefined(num) ? low : num;
    num = num > high ? high : num;
    num = num < low ? low : num;

    return num;
};

TUtil.getOptionValue = function(option, defaultValue, tmodel)    {
    return !TUtil.isDefined(option) ? defaultValue : typeof option === 'function' ? option.call(tmodel) : option;
};

TUtil.executeFunctionByName = function (functionName, context /*, args */) {
    if (!functionName)
        return null;

    var args = Array.prototype.slice.call(arguments, 2);
    var namespaces = functionName.split(".");
    var func = namespaces.pop();
    for (var i = 0; i < namespaces.length; i++) {
        context = context[namespaces[i]];
    }

    if (context && context[func]) {
        return context[func].apply(context, args);
    }
};

TUtil.formatPeriod = function (seconds) {
    seconds = seconds < 0 ? 0 : seconds;
    if (seconds < 120) {
        return seconds + " sec";
    } else if (seconds < 7200) {
        return Math.floor(seconds / 60) + " min";
    } else if (seconds < 172800) {
        return Math.floor(seconds / 3600) + " hours";
    } else {
        return Math.floor(seconds / 86400)  + " days";
    }
};

TUtil.formatNum = function (num, precision) {
    if (!num) return 0;
    var s = num.toString();
    var n = parseFloat(s);
    return n.toFixed(precision);
};

TUtil.distance = function(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
};

TUtil.getFullLink = function(link) {
    if (!TUtil.isDefined(link)) return;
    
    if (link.indexOf('http') === 0) {
        return link;
    } else {
        var protocol = window.location.protocol;
        protocol += protocol.endsWith(":") ? "//" : "://";
        var base = protocol + window.location.hostname;
        return link.startsWith("/") ? base + link : base + "/" + link;
    }
};

function EasingEffects() {}

EasingEffects.linear =function (t) {
    return t;
};

EasingEffects.easeInQuad = function (t) {
    return t * t;
};

EasingEffects.easeOutExpo = function (t) {
    return 1 - (1 - t) * (1 - t);
};
  
EasingEffects.circular = function (t) {
    return Math.sqrt(1 - (--t * t));
};

