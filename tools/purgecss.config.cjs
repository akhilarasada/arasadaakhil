// Which style rules survive the build: anything whose class, id or attribute is mentioned in
// the page or in a script. State classes are always kept, since scripts add them at run time.
module.exports = {
  content: ['src/index.html', 'src/*.js'],
  css: ['src/styles.css'],
  safelist: {
    standard: ['js', 'loaded', 'in', 'done', /^is-/, /^has-/],
    deep: [/^is-/, /^has-/],
    greedy: [/data-/, /view-transition/]
  },
  keyframes: true,
  fontFace: false,
  variables: false
};
