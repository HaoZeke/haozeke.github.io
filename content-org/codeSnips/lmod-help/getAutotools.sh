cd $hpcroot
myprefix=$HOME/.hpc/autotools
export PATH
wget http://ftp.gnu.org/gnu/autoconf/autoconf-2.69.tar.gz
wget http://ftp.gnu.org/gnu/automake/automake-1.16.2.tar.gz
wget http://ftp.gnu.org/gnu/libtool/libtool-2.4.6.tar.gz
wget http://ftp.gnu.org/gnu/gettext/gettext-0.20.tar.gz
wget https://gnuftp.uib.no/autoconf-archive/autoconf-archive-2021.02.19.tar.xz
tar xfv autoconf-archive-2021.02.19.tar.xz
gzip -dc autoconf-2.69.tar.gz | tar xvf -
gzip -dc automake-1.16.2.tar.gz | tar xvf -
gzip -dc libtool-2.4.6.tar.gz | tar xvf -
gzip -dc gettext-0.20.tar.gz | tar xvf -
cd autoconf-2.69
./configure -C --prefix=$myprefix/autoconf/2.69 && make -j$(nproc) && make install
cd ../automake-1.16.2
./configure -C --prefix=$myprefix/automake/1.16.2 --docdir=$myprefix/automake/1.16.2/share/doc/automake-1.16.2 && make -j$(nproc) && make install
cd ../autoconf-archive-2021.02.19
./configure -C --prefix=$myprefix/automake/1.16.2
cd ../libtool-2.4.6
./configure -C --disable-static --prefix=$myprefix/libtool/2.4.6 && make -j$(nproc) && make install
cd ../gettext-0.20
./configure -C --prefix=$myprefix/gettext/0.20 && make -j$(nproc) && make install
ml load autotools/autotools
