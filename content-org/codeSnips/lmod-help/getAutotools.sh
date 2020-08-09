myprefix=$HOME/.hpc/autotools
PATH=$myprefix/bin:$PATH
export PATH
wget http://ftp.gnu.org/gnu/m4/m4-1.4.14.tar.gz
wget http://ftp.gnu.org/gnu/autoconf/autoconf-2.64.tar.gz
wget http://ftp.gnu.org/gnu/automake/automake-1.11.1.tar.gz
wget http://ftp.gnu.org/gnu/libtool/libtool-2.4.tar.gz
gzip -dc m4-1.4.14.tar.gz | tar xvf -
gzip -dc autoconf-2.64.tar.gz | tar xvf -
gzip -dc automake-1.11.1.tar.gz | tar xvf -
gzip -dc libtool-2.4.tar.gz | tar xvf -
cd m4-1.4.14
./configure -C --prefix=$myprefix && make && make install
cd ../autoconf-2.64
./configure -C --prefix=$myprefix && make && make install
cd ../automake-1.11.1
./configure -C --prefix=$myprefix && make && make install
cd ../libtool-2.4
./configure -C --prefix=$myprefix && make && make install
