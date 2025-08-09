import marquee from 'vanilla-marquee';

export default () => ({
  active: false,
  init() {
    new marquee( document.getElementById( 'aaa' ), {
      delayBeforeStart: 0,
      direction: 'down',
      speed: 10,
    });
  }
})