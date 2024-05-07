import { $Dom } from "./$Dom.js";
import { browser } from "./Browser.js";
import { SearchUtil } from "./SearchUtil.js";
import { TUtil } from "./TUtil.js";
import { tapp } from "./App.js";


function EventListener() {

    this.currentTouch = {
        deltaY: 0, 
        deltaX: 0,
        pinchDelta: 0,
        key: '',
        manualMomentumFlag: false, 
        orientation: "none" ,
        dir: "",
        isWheel: false,
        timeStamp: 0
    };
    
    this.eventMap = {
        mousedown: 'touchstart',
        touchstart: 'touchstart',
        mousemove: 'touchmove',
        touchmove: 'touchmove',
        touchend: 'touchend',
        touchcancel: 'touchend',
        pointerup: 'touchend',
        MSPointerUp: 'touchend',
        mouseup: 'touchend',
        pointercancel: 'touchend',
        MSPointerCancel: 'touchend',
        mousecancel: 'touchend',
        mouseleave: 'touchleave',
        wheel: 'wheel',
        DOMMouseScroll: 'wheel',
        mousewheel: 'wheel',
        keyup: 'key',
        resize: 'resize',
        orientationchange: 'resize'
    };
    
    this.lastEvent = undefined;
    this.eventName = "";
    this.eventTagName = "";
    
    this.cursor = { x: 0, y: 0};
    this.start0 = undefined;
    this.start1 = undefined;    
    this.end0 = undefined;
    this.end1 = undefined;
    this.touchCount = 0;
        
    this.currentEvent = "";
    this.currentHandlers = { touch: null, scrollLeft: null, scrollTop: null, pinch: null };
}

EventListener.prototype.removeHandlers = function () {
    if (!this.bindedHandleEvent) return;
    
    var self = this;
    Object.keys(this.eventMap).forEach(function(key) {
        var target = self.eventMap[key] === 'resize' ? tapp.$window : tapp.$dom;
        target.detachEvent(key, self.bindedHandleEvent);
    });  
};

EventListener.prototype.addHandlers = function () {   
    this.bindedHandleEvent = this.bindedHandleEvent ? this.bindedHandleEvent : this.handleEvent.bind(this);
        
    var self = this;
    Object.keys(this.eventMap).forEach(function(key) {
        var target = self.eventMap[key] === 'resize' ? tapp.$window : tapp.$dom;
        target.addEvent(key, self.bindedHandleEvent);
    });
};

EventListener.prototype.captureEvents = function() {

    if (!this.lastEvent) { 
        this.currentEvent = "";
        return;
    }
    
    this.findEventHandlers(this.lastEvent);
    this.currentEvent = this.eventName;
    this.eventName = "";
    this.lastEvent = undefined;
};
    
EventListener.prototype.handleEvent = function (event) {
    
    if (this.eventName && this.eventName !== this.currentEvent) {
        return;
    }
    
    this.lastEvent = event;

    this.eventTagName = (event.target.tagName || "").toUpperCase();
    this.eventName = this.eventMap[event.type];
    
    var tmodel = this.getTModelFromEvent(event);

    if (tmodel && tmodel.keepEventDefault() 
            && (tmodel.keepEventDefault() === true || (Array.isArray(tmodel.keepEventDefault()) && tmodel.keepEventDefault().includes(this.eventName)))) {
        tapp.manager.scheduleRun(0, "ignoring=" + this.eventName + '-' + this.eventTagName);
    } else {            
        switch (this.eventName) {              
            case 'touchstart':
                this.clear();            
                this.touchCount = this.countTouches(event);
                event.preventDefault();
                this.start(event);

                break;

            case 'touchmove':
                var touch = this.getTouch(event);

                this.cursor.x = touch.x;
                this.cursor.y = touch.y;

                event.preventDefault();

                if (this.touchCount > 0) {                
                    this.move(event);
                }

                break;

            case 'touchend':
                event.preventDefault();
                this.end(event);
                break;

            case 'wheel':
                event.preventDefault();   
                this.wheel(event);
                break;

            case 'key':
                this.keyUpHandler(event);
                break;

            case 'resize':
                tapp.dim.measureScreen();
                break;

        }
        tapp.manager.scheduleRun(0, this.eventName + '-' + this.eventTagName);
    }
   
       
};
    
EventListener.prototype.findEventHandlers = function(event) {

    var tmodel = this.getTModelFromEvent(event);

    var touchHandler = tmodel ? SearchUtil.findFirstTouchHandler(tmodel) : null;
    var scrollLeftHandler = tmodel ? SearchUtil.findFirstScrollLeftHandler(tmodel) : null;
    var scrollTopHandler = tmodel ? SearchUtil.findFirstScrollTopHandler(tmodel) : null;
    var pinchHandler = tmodel ? SearchUtil.findFirstPinchHandler(tmodel) : null;

    this.currentHandlers.touch = touchHandler;
    this.currentHandlers.scrollLeft = scrollLeftHandler;
    this.currentHandlers.scrollTop = scrollTopHandler; 
    this.currentHandlers.pinch = pinchHandler; 
};

EventListener.prototype.getTModelFromEvent = function(event) {
    var oid = typeof event.target.getAttribute === 'function' ? event.target.getAttribute('id') : '';
    
    if (!oid) {
        oid = $Dom.findNearestParentWithId(event.target);
    }
                    
    return tapp.manager.visibleOidMap[oid];
};

EventListener.prototype.clear = function () {
    this.start0 = undefined;
    this.start1 = undefined;
    this.end0 = undefined;
    this.end1 = undefined;
    this.touchCount = 0;   
    this.resetCurrentTouch();
};

EventListener.prototype.resetCurrentTouch = function() {
    this.currentTouch.deltaY = 0;
    this.currentTouch.deltaX = 0;
    this.currentTouch.pinchDelta = 0;
    this.currentTouch.manualMomentumFlag = false;
    this.currentTouch.dir = "";
    this.currentTouch.orientation = "none";
    this.currentTouch.key = ''; 
    this.currentTouch.isWheel = false;
};

EventListener.prototype.resetEvents = function () {
    if (this.currentTouch.timeStamp > 0) {
    
        var diff = browser.now() - this.currentTouch.timeStamp;
        var runDelay = 0;

        if (Math.abs(this.currentTouch.deltaY) > 0.001 
                || Math.abs(this.currentTouch.deltaX) > 0.001 
                || Math.abs(this.currentTouch.pinchDelta) > 0.001)
        {
            if (diff > 70) {
                this.currentTouch.deltaY = 0;
                this.currentTouch.deltaX = 0;
                this.currentTouch.isWheel = false;
                this.currentTouch.pinchDelta = 0;                
            } else if (this.currentTouch.manualMomentumFlag) {
                this.currentTouch.deltaY *= 0.95;
                this.currentTouch.deltaX *= 0.95;
                this.currentTouch.isWheel = false;
                
                runDelay = 10;
            }
        } else if (diff > 600) {
            this.clear();
            this.currentTouch.timeStamp = 0;
        } 
    
        tapp.manager.scheduleRun(runDelay, "scroll decay"); 
    } else if (this.eventName || this.lastEvent) {
        this.eventName = "";
        tapp.manager.scheduleRun(1, "reseting current event");
    }

};

EventListener.prototype.getTouchHandler = function() {
    return this.currentHandlers.touch;
};

EventListener.prototype.getTouchHandlerType = function() {
    return this.currentHandlers.touch ? this.currentHandlers.touch.type : null;
};


EventListener.prototype.getTouchHandlerOid = function() {
    return this.currentHandlers.touch ? this.currentHandlers.touch.oid : null;
};

EventListener.prototype.isClickEvent = function() {
    return this.currentEvent === 'click';
};

EventListener.prototype.isResizeEvent = function() {
    return this.currentEvent === 'resize';
};

EventListener.prototype.getCurrentEvent = function() {
    return this.currentEvent;
};

EventListener.prototype.isClickHandler = function(target) {
    return this.getTouchHandler() === target && this.isClickEvent();
};

EventListener.prototype.isClickHandlerType = function(type) {
    return this.getTouchHandlerType() === type && this.isClickEvent();
};

EventListener.prototype.isTouchHandler = function(target) {
    return this.getTouchHandler() === target;
};

EventListener.prototype.isTouchHandlerType = function(type) {
    return this.getTouchHandlerType() === type;
};

EventListener.prototype.isTouchHandlerOrAncestor = function(target) {
    var handler = this.getTouchHandler();

    while (handler) {
        if (handler === target) {
            return true;
        }
        
        handler = handler.getParent();
    }
    
    return false;
};

EventListener.prototype.isScrollLeftHandler = function(handler)  {
    return this.currentHandlers.scrollLeft === handler;
};

EventListener.prototype.isScrollTopHandler = function(handler)  {
    return this.currentHandlers.scrollTop === handler;
};

EventListener.prototype.isPinchHandler = function(handler)  {
    return this.currentHandlers.pinch === handler;
};

EventListener.prototype.countTouches = function(event)   {
    var count =  event.touches && event.touches.length ? event.touches.length : 
        event.originalEvent && event.originalEvent.touches && event.originalEvent.touches.length ? event.originalEvent.touches.length : 1;

    return count;
};
      
EventListener.prototype.keyUpHandler = function (e) {
    e = e || window.event;
    var key = e.which || e.keyCode;
        
    this.currentTouch.key = key;

    if (key === 37) {
        this.setDeltaXDeltaY(-10, 0);
    } else if (key === 38) {
        this.setDeltaXDeltaY(0, -10);
    } else if (key === 39) {
        this.setDeltaXDeltaY(10, 0);
    } else if (key === 40) {
        this.setDeltaXDeltaY(0, 10);        
    }
};

EventListener.prototype.getTouch = function (event, index) {
    if (!event)  return undefined;
    index = index || 0;
    var e = event.touches && event.touches[index] ? event.touches[index] : event;
    if (e.originalEvent && e.originalEvent.touches) {
        e = e.originalEvent.touches[index];
    }
    
    return { 
        x: e.pageX || e.clientX || 0,
        y: e.pageY || e.clientY || 0,
        target: e.target,
        timeStamp: browser.now()
    };
};

EventListener.prototype.start = function (event) {
    this.start0 = this.getTouch(event);
    this.start1 = this.getTouch(event, 1);
    
    this.cursor.x = this.start0.x;
    this.cursor.y = this.start0.y;    
                
    return event.stopPropagation();
};

EventListener.prototype.move = function (event) {

    var deltaX, deltaY;

    if (this.touchCount === 1 ) {
        this.start0.y = this.end0 ? this.end0.y : this.start0.y;
        this.start0.x = this.end0 ? this.end0.x : this.start0.x;

        this.end0 = this.getTouch(event);
        this.start1 = undefined;
        this.end1 = undefined;
        
        if (TUtil.isDefined(this.end0)) {
            deltaX = this.start0.x - this.end0.x;
            deltaY = this.start0.y - this.end0.y;
            
            this.setDeltaXDeltaY(deltaX, deltaY);
        }

    } else if (this.touchCount >= 2) {

        this.end0 = this.getTouch(event);
        this.end1 = this.getTouch(event, 1);
        
        var length1 = TUtil.distance(this.start0.x,  this.start0.y, this.start1.x, this.start1.y);        
        var length2 = TUtil.distance(this.end0.x,  this.end0.y, this.end1.x, this.end1.y);

        this.currentTouch.diff = length2 - length1;

        this.setCurrentTouchParam('pinchDelta', this.currentTouch.diff > 0 ? 0.3 : this.currentTouch.diff  < 0 ? -0.3 : 0);
    }
       
    return event.stopPropagation();
};

EventListener.prototype.end = function (event) {
    var momentum;
            
    if (!TUtil.isDefined(this.end0)) {
        this.end0 = this.getTouch(event);
    }
    
    var startToEndTime = TUtil.isDefined(this.end0) && TUtil.isDefined(this.start0) ? this.end0.timeStamp - this.start0.timeStamp : 0;
        
    if (this.touchCount <= 1) {

        if (TUtil.isDefined(this.end0) && TUtil.isDefined(this.start0)) {

            var deltaX = this.start0.x - this.end0.x;
            var deltaY = this.start0.y - this.end0.y;
            
            var period = this.end0.timeStamp - this.start0.timeStamp;
            
                            
            if (this.currentTouch.orientation === "horizontal" && Math.abs(deltaX) > 1) {
                momentum = TUtil.momentum(0, deltaX, period); 
                this.setCurrentTouchParam('deltaX', momentum.distance,  momentum.duration);
                this.currentTouch.manualMomentumFlag = true;
            } else if (this.currentTouch.orientation === "vertical" && Math.abs(deltaY) > 1)  {
                momentum = TUtil.momentum(0, deltaY, period);
                this.setCurrentTouchParam('deltaY', momentum.distance,  momentum.duration);
                this.currentTouch.manualMomentumFlag = true;                     
            }
        } 
    }
           
    if (!momentum && this.touchCount === 1 && startToEndTime < 300) {
        this.eventName = 'click';
        this.clear();
        this.currentTouch.timeStamp = 0;
    }
     
    this.touchCount = 0;
    return event.stopPropagation();
};

EventListener.prototype.setDeltaXDeltaY = function(deltaX, deltaY, isWheel) {
    var diff = Math.abs(deltaX) - Math.abs(deltaY);
        
    if (diff >= 1) {
        if (this.currentTouch.orientation === "none" || (this.currentTouch.orientation === "vertical" && diff > 3) || this.currentTouch.orientation === "horizontal") {
            this.currentTouch.orientation = "horizontal";
            this.currentTouch.dir = deltaX <= -1 ? "left" : deltaX >= 1 ? "right" : this.currentTouch.dir;
            this.currentTouch.isWheel = isWheel;
            this.setCurrentTouchParam('deltaX', deltaX);
            this.currentTouch.deltaY = 0;
        }
    } else if (this.currentTouch.orientation === "none" || (this.currentTouch.orientation === "horizontal" && diff < -3) || this.currentTouch.orientation === "vertical") {
            this.currentTouch.orientation = "vertical";
            this.currentTouch.dir = deltaY <= -1 ? "up" : deltaY >= 1 ? "down" : this.currentTouch.dir;
            this.currentTouch.isWheel = isWheel;            
            this.setCurrentTouchParam('deltaY', deltaY);
            this.currentTouch.deltaX = 0;
    } else {
        this.currentTouch.deltaX = 0;
        this.currentTouch.deltaY = 0;
    }
};

EventListener.prototype.setCurrentTouchParam = function(name, value, timeOffset) {
    this.currentTouch[name] = value;
    this.currentTouch.timeStamp = TUtil.isDefined(timeOffset) ? browser.now() + timeOffset :  Math.max(this.currentTouch.timeStamp, browser.now());
};

EventListener.prototype.wheel = function (event) {
    var deltaX = 0, deltaY = 0;
        
    this.currentTouch.pinchDelta = 0;

    this.start0 = this.getTouch(event);

    if (event.ctrlKey && 'deltaY' in event) {
        this.setCurrentTouchParam('pinchDelta', -event.deltaY / 10);
    } else if ('deltaX' in event) {
        deltaX = event.deltaX;
        deltaY = event.deltaY;
    } else if ('wheelDeltaX' in event) {
        deltaX = -event.wheelDeltaX / 120;
        deltaY = -event.wheelDeltaY / 120;       
    } else if ('wheelDelta' in event) {
        deltaX = -event.wheelDelta / 120;        
    } else if ('detail' in event) {
        deltaX = event.detail / 3;    
    }
            
    this.setDeltaXDeltaY(deltaX, deltaY, true);
};

export { EventListener };

