let
  sources = import ./nix/sources.nix;
  pkgs = import sources.nixpkgs { };
  stdenv = pkgs.stdenv;
  myGems = pkgs.bundlerEnv {
    name = "gems-for-some-project";
    gemdir = ./.;
  };
  myHaskellEnv = pkgs.haskellPackages.ghcWithPackages
    (haskellPackages: with haskellPackages; [ pandoc pandoc-citeproc ]);
  hook = ''
    mkdir -p "$(pwd)/_libs"
    export R_LIBS_USER="$(pwd)/_libs"
    eval $(egrep ^export ${myHaskellEnv}/bin/ghc)
  '';
in pkgs.mkShell {
  buildInputs = with pkgs; [
    # Shell
    bashInteractive
    direnv
    openssl
    # Build
    emacs
    hugo
    git
    nodejs
    postcss-cli
    # Ruby
    myGems
    (lowPrio myGems.wrappedRuby)
    # Haskell
    myHaskellEnv
  ];
  shellHook = hook;
  GIT_SSL_CAINFO = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
  LOCALE_ARCHIVE = stdenv.lib.optionalString stdenv.isLinux
    "${pkgs.glibcLocales}/lib/locale/locale-archive";
}
