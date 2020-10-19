mkdir -p ~/tmpHPC
cd $HOME/tmpHPC
myprefix=$HOME/.hpc/autotools
export PATH
wget http://ftp.gnu.org/gnu/m4/m4-1.4.18.tar.gz
wget http://ftp.gnu.org/gnu/autoconf/autoconf-2.69.tar.gz
wget http://ftp.gnu.org/gnu/automake/automake-1.16.2.tar.gz
wget http://ftp.gnu.org/gnu/libtool/libtool-2.4.6.tar.gz
gzip -dc m4-1.4.18.tar.gz | tar xvf -
gzip -dc autoconf-2.69.tar.gz | tar xvf -
gzip -dc automake-1.16.2.tar.gz | tar xvf -
gzip -dc libtool-2.4.6.tar.gz | tar xvf -
cd m4-1.4.18
./configure -C --prefix=$myprefix/m4/1.4.18 && make -j$(nproc) && make install
cd ../autoconf-2.69
./configure -C --prefix=$myprefix/autoconf/2.69 && make -j$(nproc) && make install
cd ../automake-1.16.2
./configure -C --prefix=$myprefix/automake/1.16.2 && make -j$(nproc) && make install
cd ../libtool-2.4.6
./configure -C --prefix=$myprefix/libtool/2.4.6 && make -j$(nproc) && make install
ml load autotools/autotools
