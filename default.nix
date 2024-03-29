let
  sources = import ./nix/sources.nix;
  pkgs = import sources.nixpkgs { };
  # haskellpkgs is a pinned version of nixpkgs
  # https://github.com/HaoZeke/haozeke.github.io/commit/e312ff597931fde168e4da6aec37164ef2616894#diff-a0745f7ed88cfac6058d1d4cfb57bc71127a28ad7c6756004142a90aab5ee99f
  hpkgs = import sources.haskellpkgs {};
  myHaskellEnv = hpkgs.haskellPackages.ghcWithPackages
    (haskellPackages: with haskellPackages; [ pandoc_2_10_1 pandoc-citeproc ]);
  # Don't go beyond 2.10.1 until https://github.com/kaushalmodi/ox-hugo/issues/336 is closed
  # https://github.com/vaibhavsagar/website/blob/master/blog/quick-easy-nixpkgs-pinning.md
  stdenv = pkgs.stdenv;
  myGems = pkgs.bundlerEnv {
    name = "gems-for-some-project";
    gemdir = builtins.path { path = ./.; name = "haozeke.github.io"; };
  };
  nodePkgs = (pkgs.callPackage ./node.nix {
    inherit pkgs;
    nodejs = pkgs.nodejs-12_x;
  }).shell.nodeDependencies;
in pkgs.stdenv.mkDerivation {
  name = "rgoswami.me-0.1";

  srcs = builtins.path { path = ./.; name = "haozeke.github.io"; };

  LANG = "en_US.UTF-8";

  LOCALE_ARCHIVE = pkgs.lib.optionalString stdenv.isLinux
    "${pkgs.glibcLocales}/lib/locale/locale-archive";

  buildInputs = with pkgs; [
    # Shell
    bashInteractive
    direnv
    openssl
    # Build
    emacs
    hugo
    git
    curl
    nodejs
    postcss-cli
    which
    sysctl
    # Ruby
    myGems
    ]
 ++ [ hpkgs.pandoc ];

  configurePhase = ''
    mkdir -p "$(pwd)/_libs"
    export R_LIBS_USER="$(pwd)/_libs"
    ln -s ${nodePkgs}/lib/node_modules ./node_modules
    export PATH="${nodePkgs}/bin:$PATH"
  '';

  buildPhase = ''
    # Build
    rake hugoBuild
  '';

  installPhase = "cp -r public $out";
}
