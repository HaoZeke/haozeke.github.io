{
  description = "A NUR test flake";
  inputs = {
    nixpkgs = { url = "github:NixOS/nixpkgs/21.05"; flake = true; };
    nur = { url = "github:NixOS/nixpkgs/21.05"; flake = true; };
  };
  outputs = { self, nixpkgs, nur }: {
    packages.x86_64-linux.hello = nur.repos.mic92.hello-nur;
    defaultPackage.x86_64-linux = self.packages.x86_64-linux.hello;
  };
}
