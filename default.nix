let
  sources = import ./nix/sources.nix;
  pkgs = import sources.nixpkgs { };
  stdenv = pkgs.stdenv;
  myGems = pkgs.bundlerEnv {
    name = "gems-for-some-project";
    gemdir = ./.;
  };
  nodePkgs = (pkgs.callPackage ./node.nix {
    inherit pkgs;
    nodejs = pkgs.nodejs-12_x;
  }).shell.nodeDependencies;
in pkgs.stdenv.mkDerivation {
  name = "rgoswami.me-0.1";

  srcs = ./.;

  LANG = "en_US.UTF-8";

  LOCALE_ARCHIVE = "${pkgs.glibcLocales}/lib/locale/locale-archive";

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
    # Ruby
    myGems
    (lowPrio myGems.wrappedRuby)
    pandoc
  ];

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
