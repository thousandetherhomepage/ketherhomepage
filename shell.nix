with (import <nixpkgs> { });
let
  packages = [
    nodejs-14_x
    nodePackages.npm
    nodePackages.vls # vue languag server
  ];

  # define shell startup command with special handling for OSX
  baseHooks = ''
    export PS1='\n\[\033[1;32m\][nix-shell:\w]($(git rev-parse --abbrev-ref HEAD))\$\[\033[0m\] '
    export LANG=en_US.UTF-8
  '';

  nodeHooks = ''
    export NODE_BIN=$PWD/assets/node_modules/.bin
    export PATH=$NODE_BIN:$PATH
  '';

  hooks = baseHooks + nodeHooks;
in pkgs.mkShell {
  buildInputs = packages;
  shellHook = hooks;
}
