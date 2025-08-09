export default () => ({
     sections: [
      { id: 'home', mode: 'auto' },    // 'snap' | 'flow' | 'auto' (auto = decide by height)
      { id: 'skills', mode: 'auto' },
      { id: 'projects', mode: 'auto' }, // long -> will become 'flow'
    ],
    currentSection: 'home',
    currentIndex: 0,
    isAnimating: false,
    wheelAccum: 0,
    wheelThreshold: 80,
    settleDelayMs: 140,
    settleTimer: null,
    touchStartY: 0,
    boundaryPx: 80, // distance to consider "near" top/bottom for flow sections

    ianit() {
      window.scrollTo(0, 0); // reset scroll position on init
      // resolve auto modes based on initial viewport
      this.resolveModes();

      this.currentIndex = this.indexFromViewport();
      this.$watch('currentIndex', (newIndex) => {
        this.currentSection = this.sections[newIndex].id;
      });

      window.addEventListener('resize', () => this.resolveModes(), { passive: true });

      // Wheel: only prevent default when we take control
      window.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

      // Touch
      window.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
      window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });

      // Keyboard (optional)
      window.addEventListener('keydown', this.onKey.bind(this));
      window.addEventListener('scroll', this.onScrollDebounced.bind(this), { passive: true });
    },
    scrollToSection(sectionId) {
      const index = this.sections.findIndex(s => s.id === sectionId);
      if (index !== -1) {
        this.scrollToIndex(index);
      }
    },

    resolveModes() {
      const vh = window.innerHeight;
      this.sections.forEach(s => {
        if (s.mode === 'auto') {
          const el = document.getElementById(s.id);
          s._mode = (el && el.offsetHeight > vh * 1.1) ? 'flow' : 'snap';
        } else {
          s._mode = s.mode;
        }
      });
    },

    onWheel(e) {
      if (this.isAnimating) { e.preventDefault(); return; }

      const section = this.sections[this.currentIndex];
      const el = document.getElementById(section.id);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const dir = Math.sign(e.deltaY) || 0;

      // If current is FLOW, let native scroll… unless we're at a boundary and the user keeps going
      if (section._mode === 'flow') {
        const nearTop = rect.top >= -this.boundaryPx; // close to top
        const nearBottom = rect.bottom <= window.innerHeight + this.boundaryPx; // close to bottom

        if ((dir < 0 && nearTop && this.currentIndex > 0)) {
          // going up at top -> snap to previous
          e.preventDefault();
          this.gotoByDelta(-1);
          return;
        }
        if ((dir > 0 && nearBottom && this.currentIndex < this.sections.length - 1)) {
          // going down at bottom -> snap to next
          e.preventDefault();
          this.gotoByDelta(1);
          return;
        }
        // otherwise: free scroll inside the long section
        return; // do NOT preventDefault
      }

      // SNAP section: accumulate to fire once per gesture
      this.wheelAccum += e.deltaY;
      if (Math.abs(this.wheelAccum) >= this.wheelThreshold) {
        const step = Math.sign(this.wheelAccum);
        this.wheelAccum = 0;
        e.preventDefault();
        this.gotoByDelta(step);
      }
    },

    onTouchStart(e) {
      this.touchStartY = e.touches[0].clientY;
    },

    onTouchMove(e) {
      if (this.isAnimating) { e.preventDefault(); return; }
      const dy = e.touches[0].clientY - this.touchStartY;
      if (Math.abs(dy) < 40) return;

      const dir = dy < 0 ? 1 : -1; // swipe up -> go down
      const section = this.sections[this.currentIndex];
      const el = document.getElementById(section.id);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const nearTop = rect.top >= -this.boundaryPx;
      const nearBottom = rect.bottom <= window.innerHeight + this.boundaryPx;

      if (section._mode === 'flow') {
        if (dir < 0 && nearTop && this.currentIndex > 0) { e.preventDefault(); this.gotoByDelta(-1); }
        else if (dir > 0 && nearBottom && this.currentIndex < this.sections.length - 1) { e.preventDefault(); this.gotoByDelta(1); }
        else {
          // free scroll
          return;
        }
      } else {
        e.preventDefault();
        this.gotoByDelta(dir);
      }
    },

    onKey(e) {
      if (this.isAnimating) return;
      if (['ArrowDown','PageDown',' '].includes(e.key)) { e.preventDefault(); this.gotoByDelta(1); }
      else if (['ArrowUp','PageUp'].includes(e.key)) { e.preventDefault(); this.gotoByDelta(-1); }
      else if (e.key === 'Home') { e.preventDefault(); this.scrollToIndex(0); }
      else if (e.key === 'End') { e.preventDefault(); this.scrollToIndex(this.sections.length - 1); }
    },

    onScrollDebounced() {
      clearTimeout(this.settleTimer);
      this.settleTimer = setTimeout(() => {
        this.currentIndex = this.indexFromViewport();
      }, this.settleDelayMs);
    },

    gotoByDelta(delta) {
      const next = this.clampIndex(this.currentIndex + delta);
      if (next === this.currentIndex) return;
      this.scrollToIndex(next);
    },

    async scrollToIndex(idx) {
      this.isAnimating = true;
      const id = this.sections[idx].id;
      const el = document.getElementById(id);
      if (!el) { this.isAnimating = false; return; }

      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      await this.waitForScrollSettle();
      this.currentIndex = this.indexFromViewport();
      this.isAnimating = false;
    },

    waitForScrollSettle() {
      return new Promise(resolve => {
        let timer;
        const onScroll = () => {
          clearTimeout(timer);
          timer = setTimeout(done, this.settleDelayMs);
        };
        const done = () => {
          window.removeEventListener('scroll', onScroll, { passive: true });
          resolve();
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
      });
    },

    indexFromViewport() {
      let bestIdx = 0, bestDist = Infinity;
      for (let i = 0; i < this.sections.length; i++) {
        const el = document.getElementById(this.sections[i].id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top);
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      }
      return bestIdx;
    },

    clampIndex(i) { return Math.max(0, Math.min(this.sections.length - 1, i)); }

})