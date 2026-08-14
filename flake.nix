{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, utils }:
    utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in {

        devShells.default = with pkgs; mkShell {
          buildInputs = [
            nodejs_24
            yarn

            foundry
          ];

          shellHook = ''
            export PS1="[dev] $PS1"
            export PATH=$PWD/node_modules/.bin:$PATH
            [[ -f .env ]] && source .env
          '';
        };
      });
}
