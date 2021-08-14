{
  exifr = {
    groups = ["default"];
    platforms = [];
    source = {
      remotes = ["https://rubygems.org"];
      sha256 = "0mylhwmh6n4xihxr9s3zj0lc286f5maxbqd4dgk3paqnd7afz88s";
      type = "gem";
    };
    version = "1.3.9";
  };
  fspath = {
    groups = ["default"];
    platforms = [];
    source = {
      remotes = ["https://rubygems.org"];
      sha256 = "0xcxikkrjv8ws328nn5ax5pyfjs8pn7djg1hks7qyb3yp6prpb5m";
      type = "gem";
    };
    version = "3.1.2";
  };
  image_optim = {
    dependencies = ["exifr" "fspath" "image_size" "in_threads" "progress"];
    groups = ["default"];
    platforms = [];
    source = {
      remotes = ["https://rubygems.org"];
      sha256 = "0qglx4lrzw9kj7yqz11yxma3paha0b5dlv2spq7ifrv22hl6r27r";
      type = "gem";
    };
    version = "0.30.0";
  };
  image_optim_pack = {
    dependencies = ["fspath" "image_optim"];
    groups = ["default"];
    platforms = [];
    source = {
      remotes = ["https://rubygems.org"];
      sha256 = "1dd02fj830r1ljw9kga6ps5mkxkpawj5sn993g2kvj0vgycndy4a";
      type = "gem";
    };
    version = "0.7.0.20210511";
  };
  image_size = {
    groups = ["default"];
    platforms = [];
    source = {
      remotes = ["https://rubygems.org"];
      sha256 = "1baphby5hmzmg4bk3gq9fyji9spdy9qmnq0yn4fxxiqc79jbk9vv";
      type = "gem";
    };
    version = "2.1.1";
  };
  in_threads = {
    groups = ["default"];
    platforms = [];
    source = {
      remotes = ["https://rubygems.org"];
      sha256 = "0m71806p1gm4kxiz4gvkyr8qip16hifn2kdf926jz44jj6kc6bbs";
      type = "gem";
    };
    version = "1.5.4";
  };
  progress = {
    groups = ["default"];
    platforms = [];
    source = {
      remotes = ["https://rubygems.org"];
      sha256 = "0wymdk40cwrqn32gwg1kw94s5p1n0z3n7ma7x1s62gd4vw3d63in";
      type = "gem";
    };
    version = "3.6.0";
  };
  rake = {
    groups = ["default"];
    platforms = [];
    source = {
      remotes = ["https://rubygems.org"];
      sha256 = "1iik52mf9ky4cgs38fp2m8r6skdkq1yz23vh18lk95fhbcxb6a67";
      type = "gem";
    };
    version = "13.0.3";
  };
}
