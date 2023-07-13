{
  inputs = {
    utils.url = "github:numtide/flake-utils";
    foundry.url = "github:shazow/foundry.nix/monthly"; # Use monthly branch for permanent releases
  };

  outputs = { self, nixpkgs, utils, foundry }:
    utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ foundry.overlay ];
        };
      in {

        devShell = with pkgs; mkShell {
          buildInputs = [
            nodejs-18_x
            nodePackages.npm

            foundry-bin
          ];

          shellHook = ''
            export PS1="[dev] $PS1"
            export PATH=$PWD/node_modules/.bin:$PATH
            [[ -f .env ]] && source .env
          '';
        };
      });
}
