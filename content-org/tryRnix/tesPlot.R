library(magrittr)
library(dplyr)
library(purrr)
library(forcats)
library(tidyr)
library(modelr)
library(tidybayes)
library(tidybayes.rethinking)
library(ggplot2)
library(cowplot)
library(rstan)
library(rethinking)
library(ggrepel)
library(RColorBrewer)

theme_set(theme_tidybayes())
rstan_options(auto_write = TRUE)
options(mc.cores = parallel::detectCores())


set.seed(5)
n = 10
n_condition = 5
ABC =
  tibble(
    condition = factor(rep(c("A","B","C","D","E"), n)),
    response = rnorm(n * 5, c(0,1,2,1,-1), 0.5)
  )

mtcars_clean = mtcars %>%
  mutate(cyl = factor(cyl))

m_cyl = ulam(alist(
    cyl ~ dordlogit(phi, cutpoint),
    phi <- b_mpg*mpg,
    b_mpg ~ student_t(3, 0, 10),
    cutpoint ~ student_t(3, 0, 10)
  ),
  data = mtcars_clean,
  chains = 4,
  cores = parallel::detectCores(),
  iter = 2000
)

cutpoints = m_cyl %>%
  recover_types(mtcars_clean) %>%
  spread_draws(cutpoint[cyl])

# define the last cutpoint
last_cutpoint = tibble(
  .draw = 1:max(cutpoints$.draw),
  cyl = "8",
  cutpoint = Inf
)

cutpoints = bind_rows(cutpoints, last_cutpoint) %>%
  # define the previous cutpoint (cutpoint_{j-1})
  group_by(.draw) %>%
  arrange(cyl) %>%
  mutate(prev_cutpoint = lag(cutpoint, default = -Inf))

fitted_cyl_probs = mtcars_clean %>%
  data_grid(mpg = seq_range(mpg, n = 101)) %>%
  add_fitted_draws(m_cyl) %>%
  inner_join(cutpoints, by = ".draw") %>%
  mutate(`P(cyl | mpg)` =
    # this part is logit^-1(cutpoint_j - beta*x) - logit^-1(cutpoint_{j-1} - beta*x)
    plogis(cutpoint - .value) - plogis(prev_cutpoint - .value)
  )


data_plot = mtcars_clean %>%
  ggplot(aes(x = mpg, y = cyl, color = cyl)) +
  geom_point() +
  scale_color_brewer(palette = "Dark2", name = "cyl")

fit_plot = fitted_cyl_probs %>%
  ggplot(aes(x = mpg, y = `P(cyl | mpg)`, color = cyl)) +
  stat_lineribbon(aes(fill = cyl), alpha = 1/5) +
  scale_color_brewer(palette = "Dark2") +
  scale_fill_brewer(palette = "Dark2")

png(filename="../images/rethinking.png")
plot_grid(ncol = 1, align = "v",
  data_plot,
  fit_plot
)
dev.off
