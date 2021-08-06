# Get Perl
curl -L http://xrl.us/installperlnix | bash
cpanm --local-lib=~/perl5 local::lib && eval $(perl -I ~/perl5/lib/perl5/ -Mlocal::lib)
cpanm ExtUtils::MakeMaker --force # For git
cpanm Thread::Queue # For automake
ml load perl/5.28.0
