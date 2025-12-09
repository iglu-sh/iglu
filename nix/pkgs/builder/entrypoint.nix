{ writeShellScriptBin }:

writeShellScriptBin "entrypoint.sh" ''
  ip link add dummy0 type dummy >/dev/null 2>&1
  if [[ $? -eq 0 ]]; then
      echo "Container is running in privileged mode."
      ip link delete dummy0 >/dev/null 2>&1
      echo "Enabling cross-compiling..."

      mount binfmt_misc -t binfmt_misc /proc/sys/fs/binfmt_misc

      docker_arch=$(uname -m)
      if [[ $docker_arch == x86_64* ]]; then
        echo "Enable arm64 coss-compiling..."
        magic='\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00\xb7\x00'
        mask='\xff\xff\xff\xff\xff\xff\xff\x00\xff\xff\xff\xff\xff\xff\x00\xff\xfe\xff\xff\xff'
        arch='aarch64'
        interpreter="/run/binfmt/$arch-linux"
      elif  [[ $arch == arm* ]]; then
        echo "Enable x86_64 coss-compiling..."
        magic='\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00\x3e\x00'
        mask='\xff\xff\xff\xff\xff\xfe\xfe\x00\xff\xff\xff\xff\xff\xff\xff\xff\xfe\xff\xff\xff'
        arch='x86_64'
        interpreter="/run/binfmt/$arch-linux"
      else
        echo "Cross-compiling on $docker_arch is not supported!"
      fi

      echo ":qemu-$arch:M::$magic:$mask:$interpreter:P" > /proc/sys/fs/binfmt_misc/register
  else
      echo "Container is not running in privileged mode!"
      echo "Cross-compiling is not enabled!"
  fi   
  echo ""

  export TINI_SUBREAPER=register
  /bin/tini $@
''
