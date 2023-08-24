const ghpages = require("gh-pages");

ghpages.publish(
  "public",
  {
    branch: "main",
    repo: "https://github.com/cailiwu/cailiwu.github.io.git",
  },
  () => {
    console.log("Deploy Complete!");
  },
);
