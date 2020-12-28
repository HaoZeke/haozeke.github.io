let
  sources = import ./nix/sources.nix;
  pkgs = import sources.nixpkgs { };
  stdenv = pkgs.stdenv;
  myGems = pkgs.bundlerEnv {
    name = "gems-for-some-project";
    gemdir = ./.;
  };
  myHaskellEnv = pkgs.haskellPackages.ghcWithPackages
    (haskellPackages: with haskellPackages; [ pandoc_2_10_1 pandoc-citeproc ]);
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
    # Ruby
    myGems
    (lowPrio myGems.wrappedRuby)
    # Haskell
    myHaskellEnv
  ];

  configurePhase = ''
    mkdir -p "$(pwd)/_libs"
    export R_LIBS_USER="$(pwd)/_libs"
    eval $(egrep ^export ${myHaskellEnv}/bin/ghc)
  '';

  buildPhase = ''
    # Build
    rake hugoBuild
  '';

  installPhase = "cp -r public $out";
}
