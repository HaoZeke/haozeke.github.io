mkdir -p ~/tmpHPC
cd $HOME/tmpHPC
myprefix=$HOME/.hpc/gcc/9.2.0
export PATH
export LIBRARY_PATH=/usr/lib64/:$LIBRARY_PATH
wget https://ftp.gnu.org/gnu/gcc/gcc-9.2.0/gcc-9.2.0.tar.xz
tar xfv gcc-9.2.0.tar.xz
cd gcc-9.2.0
case $(uname -m) in
  x86_64)
    sed -e '/m64=/s/lib64/lib/' \
        -i.orig gcc/config/i386/t-linux64
  ;;
esac
mkdir -p build                                         &&
cd    build                                            &&

SED=sed                               \
../configure --prefix=$myprefix            \
             --enable-languages=c,c++,fortran \
             --disable-multilib       \
             --with-gmp=$HOME/.hpc/gcc/gmp/6.2.0 \
             --with-mpfr=$HOME/.hpc/gcc/mpfr/4.1.0 \
             --with-mpc=$HOME/.hpc/gcc/mpc/1.2.0 \
             --disable-bootstrap      \
             --with-system-zlib
make -j$(nproc)
ml load gcc/9.2.0
