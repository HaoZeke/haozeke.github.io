let
  sources = import ./nix/sources.nix;
  pkgs = import sources.nixpkgs { };
  nodePkgs = (pkgs.callPackage ./node.nix {
    inherit pkgs;
    nodejs = pkgs.nodejs-12_x;
  }).shell.nodeDependencies;
  stdenv = pkgs.stdenv;
  myGems = pkgs.bundlerEnv {
    name = "gems-for-some-project";
    gemdir = ./.;
  };
  hook = ''
    mkdir -p "$(pwd)/_libs"
    export R_LIBS_USER="$(pwd)/_libs"
    ln -s ${nodePkgs}/lib/node_modules ./node_modules
    export PATH="${nodePkgs}/bin:$PATH"
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
    curl
    nodejs
    postcss-cli
    # Ruby
    myGems
    (lowPrio myGems.wrappedRuby)
    pandoc
  ];
  shellHook = hook;
  GIT_SSL_CAINFO = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
  LOCALE_ARCHIVE = stdenv.lib.optionalString stdenv.isLinux
    "${pkgs.glibcLocales}/lib/locale/locale-archive";
}
