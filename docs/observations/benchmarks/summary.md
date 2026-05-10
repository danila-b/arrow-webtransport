# Benchmark Summary

Aggregated median metrics across the five network profiles (`lan`, `broadband`, `wan`, `mobile`, `lossy`). All values are taken from the corresponding `report.md` in each profile directory and represent the median of three persisted repetitions per case. `n/a` indicates that every repetition for that case errored (see the per-profile reports for details).

Columns reported per transport:

- **TTFB (ms)** — time from request issued to first response byte received in the browser.
- **Total (ms)** — full query time from issue to last row decoded.
- **MB/s** — payload throughput observed in the browser-side `QueryStats` payload.

Connect time, Rows/sec, success/error counts, and exception text are omitted here and remain in each per-network `report.md`.

All sessions were captured on commit `e7a06e3519a7df1f781a7ef68e8350a79633f229` with Chromium 147.0.7727.15, one warmup + three persisted repetitions per case.

## Aggregated table (all networks × all profiles)

<table>
  <thead>
    <tr>
      <th rowspan="2">Network</th>
      <th rowspan="2">Query profile</th>
      <th colspan="3">http2-arrow</th>
      <th colspan="3">http2-json</th>
      <th colspan="3">webtransport</th>
    </tr>
    <tr>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>lan</td><td>Taxi 8 cols x 100k rows</td><td>13.9</td><td>88.5</td><td>59.97</td><td>73</td><td>303.6</td><td>60.94</td><td>2.4</td><td>91.5</td><td>58.01</td></tr>
    <tr><td>lan</td><td>Taxi 8 cols x 200k rows</td><td>11.4</td><td>92.7</td><td>114.49</td><td>114.2</td><td>611.1</td><td>61.73</td><td>2.3</td><td>97.6</td><td>108.75</td></tr>
    <tr><td>lan</td><td>Taxi 8 cols x 400k rows</td><td>13.5</td><td>106.4</td><td>199.49</td><td>169.7</td><td>1263.9</td><td>60.87</td><td>2.4</td><td>155.1</td><td>136.85</td></tr>
    <tr><td>lan</td><td>Taxi 8 cols x 800k rows</td><td>10.2</td><td>132.4</td><td>320.63</td><td>297.2</td><td>2423.1</td><td>65.09</td><td>2.1</td><td>268.1</td><td>158.34</td></tr>
    <tr><td>lan</td><td>Taxi all 19 cols x 50k rows</td><td>12.1</td><td>137</td><td>52.03</td><td>66.4</td><td>249.7</td><td>62.45</td><td>2.5</td><td>170.5</td><td>41.81</td></tr>
    <tr><td>lan</td><td>Taxi all 19 cols x 100k rows</td><td>16.1</td><td>145.2</td><td>98.17</td><td>104.8</td><td>441.1</td><td>70.69</td><td>3.7</td><td>368.7</td><td>38.66</td></tr>
    <tr><td>lan</td><td>Taxi all 19 cols x 200k rows</td><td>14.7</td><td>175.2</td><td>162.69</td><td>151.9</td><td>868.2</td><td>75.37</td><td>4</td><td>643.6</td><td>44.34</td></tr>
    <tr><td>lan</td><td>Taxi all 19 cols x 400k rows</td><td>12.2</td><td>252.4</td><td>226.56</td><td>255.4</td><td>1814.5</td><td>73.91</td><td>4.5</td><td>1416.4</td><td>40.37</td></tr>
    <tr><td>broadband</td><td>Taxi 8 cols x 100k rows</td><td>58.9</td><td>617.2</td><td>8.6</td><td>183</td><td>1995.3</td><td>9.27</td><td>14.4</td><td>574.8</td><td>9.23</td></tr>
    <tr><td>broadband</td><td>Taxi 8 cols x 200k rows</td><td>62.5</td><td>1059.6</td><td>10.02</td><td>203.7</td><td>3872.4</td><td>9.74</td><td>15.2</td><td>1004.5</td><td>10.57</td></tr>
    <tr><td>broadband</td><td>Taxi 8 cols x 400k rows</td><td>60.6</td><td>1881.3</td><td>11.28</td><td>254.4</td><td>7698.9</td><td>10.06</td><td>13.2</td><td>1872.9</td><td>11.33</td></tr>
    <tr><td>broadband</td><td>Taxi 8 cols x 800k rows</td><td>55</td><td>3679</td><td>11.54</td><td>393.3</td><td>15612.2</td><td>10.25</td><td>14</td><td>3671.7</td><td>11.56</td></tr>
    <tr><td>broadband</td><td>Taxi all 19 cols x 50k rows</td><td>74.3</td><td>758.9</td><td>9.39</td><td>136.3</td><td>1640.3</td><td>9.51</td><td>15</td><td>722.1</td><td>9.87</td></tr>
    <tr><td>broadband</td><td>Taxi all 19 cols x 100k rows</td><td>62.8</td><td>1359.2</td><td>10.49</td><td>152.6</td><td>3152.9</td><td>9.89</td><td>14.3</td><td>1337.2</td><td>10.66</td></tr>
    <tr><td>broadband</td><td>Taxi all 19 cols x 200k rows</td><td>58.5</td><td>2522.3</td><td>11.31</td><td>231</td><td>6094.5</td><td>10.23</td><td>13.8</td><td>2528.6</td><td>11.29</td></tr>
    <tr><td>broadband</td><td>Taxi all 19 cols x 400k rows</td><td>64</td><td>4917.9</td><td>11.64</td><td>315.9</td><td>12945.2</td><td>10.3</td><td>14.1</td><td>4947.2</td><td>11.56</td></tr>
    <tr><td>wan</td><td>Taxi 8 cols x 100k rows</td><td>209.1</td><td>1844.2</td><td>2.88</td><td>272.1</td><td>5720.8</td><td>3.23</td><td>84.3</td><td>1751.4</td><td>3.03</td></tr>
    <tr><td>wan</td><td>Taxi 8 cols x 200k rows</td><td>172.8</td><td>3292.4</td><td>3.22</td><td>415.9</td><td>11571.5</td><td>3.3</td><td>46.9</td><td>3266.9</td><td>3.25</td></tr>
    <tr><td>wan</td><td>Taxi 8 cols x 400k rows</td><td>180.3</td><td>6222.8</td><td>3.41</td><td>391.1</td><td>22772.1</td><td>3.36</td><td>45.7</td><td>6194.7</td><td>3.43</td></tr>
    <tr><td>wan</td><td>Taxi 8 cols x 800k rows</td><td>181.4</td><td>12198.4</td><td>3.48</td><td>519.1</td><td>46200.9</td><td>3.39</td><td>54.4</td><td>12130.4</td><td>3.5</td></tr>
    <tr><td>wan</td><td>Taxi all 19 cols x 50k rows</td><td>214.3</td><td>2338.5</td><td>3.05</td><td>297.5</td><td>4945.3</td><td>3.15</td><td>44.7</td><td>2272.7</td><td>3.14</td></tr>
    <tr><td>wan</td><td>Taxi all 19 cols x 100k rows</td><td>239.4</td><td>4358.7</td><td>3.27</td><td>353.8</td><td>9434.6</td><td>3.31</td><td>59.5</td><td>4269.4</td><td>3.34</td></tr>
    <tr><td>wan</td><td>Taxi all 19 cols x 200k rows</td><td>184.5</td><td>8274.9</td><td>3.45</td><td>398.7</td><td>19397.2</td><td>3.37</td><td>55.1</td><td>8280.5</td><td>3.45</td></tr>
    <tr><td>wan</td><td>Taxi all 19 cols x 400k rows</td><td>222.2</td><td>16316.7</td><td>3.5</td><td>509.6</td><td>38004</td><td>3.4</td><td>50.6</td><td>16264.2</td><td>3.52</td></tr>
    <tr><td>mobile</td><td>Taxi 8 cols x 100k rows</td><td>375.4</td><td>11450.8</td><td>0.46</td><td>552</td><td>66067.9</td><td>0.28</td><td>132.7</td><td>4943.2</td><td>1.07</td></tr>
    <tr><td>mobile</td><td>Taxi 8 cols x 200k rows</td><td>373</td><td>34770.1</td><td>0.31</td><td>567.1</td><td>117300.2</td><td>0.32</td><td>107.1</td><td>9726.4</td><td>1.09</td></tr>
    <tr><td>mobile</td><td>Taxi 8 cols x 400k rows</td><td>347.7</td><td>70903.9</td><td>0.3</td><td>580.5</td><td>250723</td><td>0.3</td><td>108.2</td><td>37653.7</td><td>0.56</td></tr>
    <tr><td>mobile</td><td>Taxi 8 cols x 800k rows</td><td>324.3</td><td>150331.1</td><td>0.28</td><td>n/a</td><td>n/a</td><td>n/a</td><td>130.8</td><td>44436.4</td><td>0.96</td></tr>
    <tr><td>mobile</td><td>Taxi all 19 cols x 50k rows</td><td>372.9</td><td>19103.5</td><td>0.37</td><td>n/a</td><td>n/a</td><td>n/a</td><td>130.9</td><td>8733.9</td><td>0.82</td></tr>
    <tr><td>mobile</td><td>Taxi all 19 cols x 100k rows</td><td>345</td><td>42985.4</td><td>0.33</td><td>468.7</td><td>102116.4</td><td>0.31</td><td>112.1</td><td>14987.1</td><td>0.95</td></tr>
    <tr><td>mobile</td><td>Taxi all 19 cols x 200k rows</td><td>349.7</td><td>91104.9</td><td>0.31</td><td>647.8</td><td>212963.3</td><td>0.28</td><td>142.6</td><td>34215.5</td><td>0.83</td></tr>
    <tr><td>mobile</td><td>Taxi all 19 cols x 400k rows</td><td>382.2</td><td>192188.5</td><td>0.3</td><td>n/a</td><td>n/a</td><td>n/a</td><td>127.1</td><td>78637</td><td>0.73</td></tr>
    <tr><td>lossy</td><td>Taxi 8 cols x 100k rows</td><td>261.2</td><td>17517.5</td><td>0.3</td><td>412.2</td><td>75617.9</td><td>0.24</td><td>53.8</td><td>6908.9</td><td>0.77</td></tr>
    <tr><td>lossy</td><td>Taxi 8 cols x 200k rows</td><td>217.7</td><td>46628.9</td><td>0.23</td><td>400.2</td><td>147983.1</td><td>0.25</td><td>68.4</td><td>11193.2</td><td>0.95</td></tr>
    <tr><td>lossy</td><td>Taxi 8 cols x 400k rows</td><td>251.2</td><td>93994.3</td><td>0.23</td><td>n/a</td><td>n/a</td><td>n/a</td><td>53.4</td><td>41855.9</td><td>0.51</td></tr>
    <tr><td>lossy</td><td>Taxi 8 cols x 800k rows</td><td>220.3</td><td>190920.6</td><td>0.22</td><td>n/a</td><td>n/a</td><td>n/a</td><td>58.9</td><td>75174.6</td><td>0.56</td></tr>
    <tr><td>lossy</td><td>Taxi all 19 cols x 50k rows</td><td>209.8</td><td>30989.9</td><td>0.23</td><td>315</td><td>75704.3</td><td>0.21</td><td>47.7</td><td>11563.3</td><td>0.62</td></tr>
    <tr><td>lossy</td><td>Taxi all 19 cols x 100k rows</td><td>245.4</td><td>66341.7</td><td>0.21</td><td>444.9</td><td>141993.2</td><td>0.22</td><td>45.5</td><td>22349.3</td><td>0.64</td></tr>
    <tr><td>lossy</td><td>Taxi all 19 cols x 200k rows</td><td>417.6</td><td>80537.8</td><td>0.2</td><td>445.6</td><td>262252.8</td><td>0.24</td><td>64.2</td><td>57306.6</td><td>0.5</td></tr>
    <tr><td>lossy</td><td>Taxi all 19 cols x 400k rows</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td><td>62.5</td><td>115917</td><td>0.49</td></tr>
  </tbody>
</table>

## Per query profile

Each table holds one query profile and varies network and transport, so the network-sensitivity of each workload is visible at a glance.

### Taxi 8 cols x 100k rows

<table>
  <thead>
    <tr>
      <th rowspan="2">Network</th>
      <th colspan="3">http2-arrow</th>
      <th colspan="3">http2-json</th>
      <th colspan="3">webtransport</th>
    </tr>
    <tr>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>lan</td><td>13.9</td><td>88.5</td><td>59.97</td><td>73</td><td>303.6</td><td>60.94</td><td>2.4</td><td>91.5</td><td>58.01</td></tr>
    <tr><td>broadband</td><td>58.9</td><td>617.2</td><td>8.6</td><td>183</td><td>1995.3</td><td>9.27</td><td>14.4</td><td>574.8</td><td>9.23</td></tr>
    <tr><td>wan</td><td>209.1</td><td>1844.2</td><td>2.88</td><td>272.1</td><td>5720.8</td><td>3.23</td><td>84.3</td><td>1751.4</td><td>3.03</td></tr>
    <tr><td>mobile</td><td>375.4</td><td>11450.8</td><td>0.46</td><td>552</td><td>66067.9</td><td>0.28</td><td>132.7</td><td>4943.2</td><td>1.07</td></tr>
    <tr><td>lossy</td><td>261.2</td><td>17517.5</td><td>0.3</td><td>412.2</td><td>75617.9</td><td>0.24</td><td>53.8</td><td>6908.9</td><td>0.77</td></tr>
  </tbody>
</table>

### Taxi 8 cols x 200k rows

<table>
  <thead>
    <tr>
      <th rowspan="2">Network</th>
      <th colspan="3">http2-arrow</th>
      <th colspan="3">http2-json</th>
      <th colspan="3">webtransport</th>
    </tr>
    <tr>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>lan</td><td>11.4</td><td>92.7</td><td>114.49</td><td>114.2</td><td>611.1</td><td>61.73</td><td>2.3</td><td>97.6</td><td>108.75</td></tr>
    <tr><td>broadband</td><td>62.5</td><td>1059.6</td><td>10.02</td><td>203.7</td><td>3872.4</td><td>9.74</td><td>15.2</td><td>1004.5</td><td>10.57</td></tr>
    <tr><td>wan</td><td>172.8</td><td>3292.4</td><td>3.22</td><td>415.9</td><td>11571.5</td><td>3.3</td><td>46.9</td><td>3266.9</td><td>3.25</td></tr>
    <tr><td>mobile</td><td>373</td><td>34770.1</td><td>0.31</td><td>567.1</td><td>117300.2</td><td>0.32</td><td>107.1</td><td>9726.4</td><td>1.09</td></tr>
    <tr><td>lossy</td><td>217.7</td><td>46628.9</td><td>0.23</td><td>400.2</td><td>147983.1</td><td>0.25</td><td>68.4</td><td>11193.2</td><td>0.95</td></tr>
  </tbody>
</table>

### Taxi 8 cols x 400k rows

<table>
  <thead>
    <tr>
      <th rowspan="2">Network</th>
      <th colspan="3">http2-arrow</th>
      <th colspan="3">http2-json</th>
      <th colspan="3">webtransport</th>
    </tr>
    <tr>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>lan</td><td>13.5</td><td>106.4</td><td>199.49</td><td>169.7</td><td>1263.9</td><td>60.87</td><td>2.4</td><td>155.1</td><td>136.85</td></tr>
    <tr><td>broadband</td><td>60.6</td><td>1881.3</td><td>11.28</td><td>254.4</td><td>7698.9</td><td>10.06</td><td>13.2</td><td>1872.9</td><td>11.33</td></tr>
    <tr><td>wan</td><td>180.3</td><td>6222.8</td><td>3.41</td><td>391.1</td><td>22772.1</td><td>3.36</td><td>45.7</td><td>6194.7</td><td>3.43</td></tr>
    <tr><td>mobile</td><td>347.7</td><td>70903.9</td><td>0.3</td><td>580.5</td><td>250723</td><td>0.3</td><td>108.2</td><td>37653.7</td><td>0.56</td></tr>
    <tr><td>lossy</td><td>251.2</td><td>93994.3</td><td>0.23</td><td>n/a</td><td>n/a</td><td>n/a</td><td>53.4</td><td>41855.9</td><td>0.51</td></tr>
  </tbody>
</table>

### Taxi 8 cols x 800k rows

<table>
  <thead>
    <tr>
      <th rowspan="2">Network</th>
      <th colspan="3">http2-arrow</th>
      <th colspan="3">http2-json</th>
      <th colspan="3">webtransport</th>
    </tr>
    <tr>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>lan</td><td>10.2</td><td>132.4</td><td>320.63</td><td>297.2</td><td>2423.1</td><td>65.09</td><td>2.1</td><td>268.1</td><td>158.34</td></tr>
    <tr><td>broadband</td><td>55</td><td>3679</td><td>11.54</td><td>393.3</td><td>15612.2</td><td>10.25</td><td>14</td><td>3671.7</td><td>11.56</td></tr>
    <tr><td>wan</td><td>181.4</td><td>12198.4</td><td>3.48</td><td>519.1</td><td>46200.9</td><td>3.39</td><td>54.4</td><td>12130.4</td><td>3.5</td></tr>
    <tr><td>mobile</td><td>324.3</td><td>150331.1</td><td>0.28</td><td>n/a</td><td>n/a</td><td>n/a</td><td>130.8</td><td>44436.4</td><td>0.96</td></tr>
    <tr><td>lossy</td><td>220.3</td><td>190920.6</td><td>0.22</td><td>n/a</td><td>n/a</td><td>n/a</td><td>58.9</td><td>75174.6</td><td>0.56</td></tr>
  </tbody>
</table>

### Taxi all 19 cols x 50k rows

<table>
  <thead>
    <tr>
      <th rowspan="2">Network</th>
      <th colspan="3">http2-arrow</th>
      <th colspan="3">http2-json</th>
      <th colspan="3">webtransport</th>
    </tr>
    <tr>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>lan</td><td>12.1</td><td>137</td><td>52.03</td><td>66.4</td><td>249.7</td><td>62.45</td><td>2.5</td><td>170.5</td><td>41.81</td></tr>
    <tr><td>broadband</td><td>74.3</td><td>758.9</td><td>9.39</td><td>136.3</td><td>1640.3</td><td>9.51</td><td>15</td><td>722.1</td><td>9.87</td></tr>
    <tr><td>wan</td><td>214.3</td><td>2338.5</td><td>3.05</td><td>297.5</td><td>4945.3</td><td>3.15</td><td>44.7</td><td>2272.7</td><td>3.14</td></tr>
    <tr><td>mobile</td><td>372.9</td><td>19103.5</td><td>0.37</td><td>n/a</td><td>n/a</td><td>n/a</td><td>130.9</td><td>8733.9</td><td>0.82</td></tr>
    <tr><td>lossy</td><td>209.8</td><td>30989.9</td><td>0.23</td><td>315</td><td>75704.3</td><td>0.21</td><td>47.7</td><td>11563.3</td><td>0.62</td></tr>
  </tbody>
</table>

### Taxi all 19 cols x 100k rows

<table>
  <thead>
    <tr>
      <th rowspan="2">Network</th>
      <th colspan="3">http2-arrow</th>
      <th colspan="3">http2-json</th>
      <th colspan="3">webtransport</th>
    </tr>
    <tr>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>lan</td><td>16.1</td><td>145.2</td><td>98.17</td><td>104.8</td><td>441.1</td><td>70.69</td><td>3.7</td><td>368.7</td><td>38.66</td></tr>
    <tr><td>broadband</td><td>62.8</td><td>1359.2</td><td>10.49</td><td>152.6</td><td>3152.9</td><td>9.89</td><td>14.3</td><td>1337.2</td><td>10.66</td></tr>
    <tr><td>wan</td><td>239.4</td><td>4358.7</td><td>3.27</td><td>353.8</td><td>9434.6</td><td>3.31</td><td>59.5</td><td>4269.4</td><td>3.34</td></tr>
    <tr><td>mobile</td><td>345</td><td>42985.4</td><td>0.33</td><td>468.7</td><td>102116.4</td><td>0.31</td><td>112.1</td><td>14987.1</td><td>0.95</td></tr>
    <tr><td>lossy</td><td>245.4</td><td>66341.7</td><td>0.21</td><td>444.9</td><td>141993.2</td><td>0.22</td><td>45.5</td><td>22349.3</td><td>0.64</td></tr>
  </tbody>
</table>

### Taxi all 19 cols x 200k rows

<table>
  <thead>
    <tr>
      <th rowspan="2">Network</th>
      <th colspan="3">http2-arrow</th>
      <th colspan="3">http2-json</th>
      <th colspan="3">webtransport</th>
    </tr>
    <tr>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>lan</td><td>14.7</td><td>175.2</td><td>162.69</td><td>151.9</td><td>868.2</td><td>75.37</td><td>4</td><td>643.6</td><td>44.34</td></tr>
    <tr><td>broadband</td><td>58.5</td><td>2522.3</td><td>11.31</td><td>231</td><td>6094.5</td><td>10.23</td><td>13.8</td><td>2528.6</td><td>11.29</td></tr>
    <tr><td>wan</td><td>184.5</td><td>8274.9</td><td>3.45</td><td>398.7</td><td>19397.2</td><td>3.37</td><td>55.1</td><td>8280.5</td><td>3.45</td></tr>
    <tr><td>mobile</td><td>349.7</td><td>91104.9</td><td>0.31</td><td>647.8</td><td>212963.3</td><td>0.28</td><td>142.6</td><td>34215.5</td><td>0.83</td></tr>
    <tr><td>lossy</td><td>417.6</td><td>80537.8</td><td>0.2</td><td>445.6</td><td>262252.8</td><td>0.24</td><td>64.2</td><td>57306.6</td><td>0.5</td></tr>
  </tbody>
</table>

### Taxi all 19 cols x 400k rows

<table>
  <thead>
    <tr>
      <th rowspan="2">Network</th>
      <th colspan="3">http2-arrow</th>
      <th colspan="3">http2-json</th>
      <th colspan="3">webtransport</th>
    </tr>
    <tr>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
      <th>TTFB (ms)</th><th>Total (ms)</th><th>MB/s</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>lan</td><td>12.2</td><td>252.4</td><td>226.56</td><td>255.4</td><td>1814.5</td><td>73.91</td><td>4.5</td><td>1416.4</td><td>40.37</td></tr>
    <tr><td>broadband</td><td>64</td><td>4917.9</td><td>11.64</td><td>315.9</td><td>12945.2</td><td>10.3</td><td>14.1</td><td>4947.2</td><td>11.56</td></tr>
    <tr><td>wan</td><td>222.2</td><td>16316.7</td><td>3.5</td><td>509.6</td><td>38004</td><td>3.4</td><td>50.6</td><td>16264.2</td><td>3.52</td></tr>
    <tr><td>mobile</td><td>382.2</td><td>192188.5</td><td>0.3</td><td>n/a</td><td>n/a</td><td>n/a</td><td>127.1</td><td>78637</td><td>0.73</td></tr>
    <tr><td>lossy</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td><td>62.5</td><td>115917</td><td>0.49</td></tr>
  </tbody>
</table>
