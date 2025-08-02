export class TouchManager {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      threshold: 10,
      swipeThreshold: 50,
      longPressDelay: 500,
      doubleTapDelay: 300,
      pinchThreshold: 0.1,
      preventScroll: true,
      ...options
    };
    
    this.touches = new Map();
    this.gesture = null;
    this.handlers = new Map();
    this.lastTap = 0;
    this.longPressTimer = null;
    
    this.init();
  }

  init() {
    // Use passive listeners for better performance
    const options = { passive: !this.options.preventScroll };
    
    this.element.addEventListener('touchstart', this.onTouchStart.bind(this), options);
    this.element.addEventListener('touchmove', this.onTouchMove.bind(this), options);
    this.element.addEventListener('touchend', this.onTouchEnd.bind(this));
    this.element.addEventListener('touchcancel', this.onTouchCancel.bind(this));
    
    // Prevent default behaviors
    if (this.options.preventScroll) {
      this.element.style.touchAction = 'none';
    }
  }

  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(handler);
    return this;
  }

  off(event, handler) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  emit(event, data) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  onTouchStart(e) {
    // Store touch points
    Array.from(e.changedTouches).forEach(touch => {
      this.touches.set(touch.identifier, {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        x: touch.clientX,
        y: touch.clientY,
        velocityX: 0,
        velocityY: 0
      });
    });

    // Detect gesture type
    this.detectGestureType();

    // Check for tap/double tap
    const now = Date.now();
    if (this.touches.size === 1) {
      if (now - this.lastTap < this.options.doubleTapDelay) {
        this.handleDoubleTap(e);
        this.lastTap = 0;
      } else {
        this.lastTap = now;
        // Start long press timer
        this.longPressTimer = setTimeout(() => {
          this.handleLongPress(e);
        }, this.options.longPressDelay);
      }
    }

    this.emit('touchstart', {
      touches: Array.from(this.touches.values()),
      originalEvent: e
    });
  }

  onTouchMove(e) {
    if (this.options.preventScroll) {
      e.preventDefault();
    }

    // Update touch points
    Array.from(e.changedTouches).forEach(touch => {
      const storedTouch = this.touches.get(touch.identifier);
      if (storedTouch) {
        const deltaTime = Date.now() - storedTouch.startTime;
        storedTouch.velocityX = (touch.clientX - storedTouch.x) / deltaTime * 1000;
        storedTouch.velocityY = (touch.clientY - storedTouch.y) / deltaTime * 1000;
        storedTouch.x = touch.clientX;
        storedTouch.y = touch.clientY;
      }
    });

    // Cancel long press if moved
    if (this.longPressTimer) {
      const touch = this.touches.values().next().value;
      const distance = this.getDistance(
        touch.startX, touch.startY,
        touch.x, touch.y
      );
      
      if (distance > this.options.threshold) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }

    // Handle ongoing gestures
    switch (this.gesture) {
      case 'pan':
        this.handlePan(e);
        break;
      case 'pinch':
        this.handlePinch(e);
        break;
      case 'rotate':
        this.handleRotate(e);
        break;
    }

    this.emit('touchmove', {
      touches: Array.from(this.touches.values()),
      gesture: this.gesture,
      originalEvent: e
    });
  }

  onTouchEnd(e) {
    clearTimeout(this.longPressTimer);

    // Get ending touches
    const endedTouches = [];
    Array.from(e.changedTouches).forEach(touch => {
      const storedTouch = this.touches.get(touch.identifier);
      if (storedTouch) {
        endedTouches.push(storedTouch);
        this.touches.delete(touch.identifier);
      }
    });

    // Handle tap if no movement
    if (endedTouches.length === 1 && this.touches.size === 0) {
      const touch = endedTouches[0];
      const distance = this.getDistance(
        touch.startX, touch.startY,
        touch.x, touch.y
      );
      
      if (distance < this.options.threshold) {
        this.handleTap(e, touch);
      } else {
        // Check for swipe
        this.detectSwipe(touch);
      }
    }

    // End gestures
    if (this.touches.size === 0) {
      this.gesture = null;
    }

    this.emit('touchend', {
      touches: endedTouches,
      remaining: Array.from(this.touches.values()),
      originalEvent: e
    });
  }

  onTouchCancel(e) {
    clearTimeout(this.longPressTimer);
    
    Array.from(e.changedTouches).forEach(touch => {
      this.touches.delete(touch.identifier);
    });

    if (this.touches.size === 0) {
      this.gesture = null;
    }

    this.emit('touchcancel', { originalEvent: e });
  }

  detectGestureType() {
    if (this.touches.size === 1) {
      this.gesture = 'pan';
    } else if (this.touches.size === 2) {
      this.gesture = 'pinch';
    } else if (this.touches.size > 2) {
      this.gesture = 'rotate';
    }
  }

  handleTap(e, touch) {
    this.emit('tap', {
      x: touch.x,
      y: touch.y,
      originalEvent: e
    });
  }

  handleDoubleTap(e) {
    const touch = this.touches.values().next().value;
    this.emit('doubletap', {
      x: touch.x,
      y: touch.y,
      originalEvent: e
    });
  }

  handleLongPress(e) {
    const touch = this.touches.values().next().value;
    this.emit('longpress', {
      x: touch.x,
      y: touch.y,
      originalEvent: e
    });

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  handlePan(e) {
    const touch = this.touches.values().next().value;
    const deltaX = touch.x - touch.startX;
    const deltaY = touch.y - touch.startY;

    this.emit('pan', {
      deltaX,
      deltaY,
      velocityX: touch.velocityX,
      velocityY: touch.velocityY,
      x: touch.x,
      y: touch.y,
      originalEvent: e
    });
  }

  handlePinch(e) {
    const touches = Array.from(this.touches.values());
    if (touches.length < 2) return;

    const touch1 = touches[0];
    const touch2 = touches[1];

    // Calculate current distance
    const currentDistance = this.getDistance(
      touch1.x, touch1.y,
      touch2.x, touch2.y
    );

    // Calculate initial distance
    const initialDistance = this.getDistance(
      touch1.startX, touch1.startY,
      touch2.startX, touch2.startY
    );

    const scale = currentDistance / initialDistance;

    // Calculate center point
    const centerX = (touch1.x + touch2.x) / 2;
    const centerY = (touch1.y + touch2.y) / 2;

    this.emit('pinch', {
      scale,
      centerX,
      centerY,
      distance: currentDistance,
      originalEvent: e
    });
  }

  handleRotate(e) {
    const touches = Array.from(this.touches.values());
    if (touches.length < 2) return;

    const touch1 = touches[0];
    const touch2 = touches[1];

    // Calculate angles
    const startAngle = Math.atan2(
      touch2.startY - touch1.startY,
      touch2.startX - touch1.startX
    );

    const currentAngle = Math.atan2(
      touch2.y - touch1.y,
      touch2.x - touch1.x
    );

    const rotation = (currentAngle - startAngle) * 180 / Math.PI;

    this.emit('rotate', {
      rotation,
      centerX: (touch1.x + touch2.x) / 2,
      centerY: (touch1.y + touch2.y) / 2,
      originalEvent: e
    });
  }

  detectSwipe(touch) {
    const deltaX = touch.x - touch.startX;
    const deltaY = touch.y - touch.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < this.options.swipeThreshold) return;

    const duration = Date.now() - touch.startTime;
    const velocity = distance / duration * 1000;

    let direction;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    this.emit('swipe', {
      direction,
      distance,
      duration,
      velocity,
      deltaX,
      deltaY,
      startX: touch.startX,
      startY: touch.startY,
      endX: touch.x,
      endY: touch.y
    });
  }

  getDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  destroy() {
    this.element.removeEventListener('touchstart', this.onTouchStart);
    this.element.removeEventListener('touchmove', this.onTouchMove);
    this.element.removeEventListener('touchend', this.onTouchEnd);
    this.element.removeEventListener('touchcancel', this.onTouchCancel);
    
    clearTimeout(this.longPressTimer);
    this.touches.clear();
    this.handlers.clear();
  }
}