# shell.nix
{ pkgs ? import <nixpkgs> { } }:
with pkgs;
let
  rethinking = with rPackages;
    buildRPackage {
      name = "rethinking";
      src = fetchFromGitHub {
        owner = "rmcelreath";
        repo = "rethinking";
        rev = "d0978c7f8b6329b94efa2014658d750ae12b1fa2";
        sha256 = "1qip6x3f6j9lmcmck6sjrj50a5azqfl6rfhp4fdj7ddabpb8n0z0";
      };
      propagatedBuildInputs = [ coda MASS mvtnorm loo shape rstan dagitty ];
    };
  tidybayes_rethinking = with rPackages;
    buildRPackage {
      name = "tidybayes.rethinking";
      src = fetchFromGitHub {
        owner = "mjskay";
        repo = "tidybayes.rethinking";
        rev = "df903c88f4f4320795a47c616eef24a690b433a4";
        sha256 = "1jl3189zdddmwm07z1mk58hcahirqrwx211ms0i1rzbx5y4zak0c";
      };
      propagatedBuildInputs =
        [ dplyr tibble rlang MASS tidybayes rethinking rstan ];
    };
  rEnv = rWrapper.override {
    packages = with rPackages; [
      ggplot2
      tidyverse
      tidybayes
      devtools
      modelr
      cowplot
      ggrepel
      RColorBrewer
      purrr
      forcats
      rstan
      rethinking
      tidybayes_rethinking
    ];
  };
in mkShell {
  inputsFrom = [ rEnv ];
  shellHook = ''
    mkdir -p "$(pwd)/_libs"
    export R_LIBS_USER="$(pwd)/_libs"
    echo ${rEnv}
  '';
  GIT_SSL_CAINFO = "${cacert}/etc/ssl/certs/ca-bundle.crt";
  LOCALE_ARCHIVE = stdenv.lib.optionalString stdenv.isLinux
    "${glibcLocales}/lib/locale/locale-archive";
}
