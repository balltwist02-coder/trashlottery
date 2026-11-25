/* ---------- телефон: Кирью поворачивается к нам, потом камера пролетает от вида сверху к его лицу ----------
   когда камера подлетела, справа выезжает экран телефона. Закрыть: тап мимо телефона или по телефону в сумке.
   поворот к зрителю нужен, чтобы камера не влетала в стенки: со стороны зрителя всегда пусто (иначе Кирью не был бы виден) */
const PHT = window.__PHT = { ang: 1.05, el: .25, vh: 1.3, sh: .32, fov: 34, fy: 0 };   // ракурс крупного плана: угол от лица вбок, снизу, высота кадра, сдвиг вбок, угол обзора
const PH = { on: false, k: 0, turn: false, cam: new THREE.PerspectiveCamera(30, 1, .03, 300) };
let VCAM = cam;
const PH_FACE = new THREE.Vector3(VIEW.x, 0, VIEW.z).normalize(), PH_YAW = Math.atan2(PH_FACE.x, PH_FACE.z);
const phTap = document.createElement('div');                   // прозрачный слой поверх игры: тап закрывает телефон
phTap.style.cssText = 'position:fixed;inset:0;z-index:40;display:none';
phTap.addEventListener('click', e => { e.stopPropagation(); closePhone() });
document.body.appendChild(phTap);
{ const st = document.createElement('style'); st.textContent = 'body.phon .coins,body.phon .depth,body.phon .mapbtn,body.phon .supbtn,body.phon .pouch{opacity:0;pointer-events:none;transition:opacity .2s}'; document.head.appendChild(st) }
const PH_WALL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGwAAADqCAIAAADI7TdfAAAbl0lEQVR4Xu09CXAcx3Eze0dRFD+ZD8AXJEAQDwkCOJAECPARSElUZEu2ZFmSzdiWHJuO4nJSiSNFlpNYju04jmVJVa5KKoqiSFYkSv4kxeVKZFqkwB8ESPGFQDwkgAMBguAD8FUkkrep2d7rm5t9bnbvW1DbdYXqm+3p6e7tme7pnT3QiZPnUUoJIaqqEkJ83IUdFN98ybtOEF2PUkXzSHYrfNyRHYKEMMvBhPZxd3ZQNNsxM2p/fdyNHRTNfKo2qeHj447tAOsgVdUIZeDjbuzAPBHcUAvtPu7GDgrajtJY/48PvmP3W9oUTEp3RXPDSDQuMzzc8lY0dYpr52muG3z2OD2oGu3gQMdPTC2GoKzdDT1Apwrfsfut5TX3po9/quRMkg94or4mphxfXnNPynlqe4E0yszz7zn8psxYiqfi8o7db3lHnnDLm4SQnsNvJMxb6KScYlXV6w5QhYBMx8cppT2H35hTdm9Cm9BJOSW4T4TFC/bOPi5vB9ixmMem7Y3Mk4XY7SBmZaNvVmRmnphkbEp5TB9x8rAqTtRviaqiD/s4rGlSdojtnaNVbbaP9nGoJ0jaQd87J7nvcbd33N74m6yMm/w+T9CXTs4tJawgBpVE1cdd2AGisx5z7fHuQ7+Olm+l6KOFXln+I5cejJi4Ftt96DeEEM2OUvQyPK8bGrZ3xnqiDZ5ffj8hZO6iz0nSy/AciTTbdjE3gv11TP7JuQtgfwLpno+7sAN7ZBq1Kz4n1HfPfjv3DNkOZ8l29Dkhyy19XMtPnNkB6ol6XB6J+Nadv8y6/OwZi1B31MTKaO0zmTrrqroHZOqmaaWhU6Yt8uNJknGV7Z212KLvE30cgoQjO8TO4kTnFFtTfRxii6QdgtH9srN45DR+Xd/0+t55JMZl78isPzIV9zHcnmbLjtdH4v4sozLnzKhMMja52CddZ/kAe+7sIh45jV8jnX7Ljtds4jXNmVHh9JBnw/bX6les8w+Fot306axFTzgh5uOO7cCfxYF4B+dyPnb40f0bGra/5k53fe+c0VgWPVMqWd9t2L7BpA4qUUtu2L5Bcqyj+18jhMweBxUtu1zFdFyYzv47QKRz36vzKtfpZUGH70XR3Jkh//xNkmeP9AdV2h2A91ic4e9ue9V1X6djeZaeeeKIO/uSpnO9ru3APDGZmmjm+7677VWvyZx470wpfXfbKy5ils1+XCa2mtJs3vpfa1Z9yV0MTYc8Os9psxb752ITnoW1Pzesv8cCazac0/Fxp3aAV3X990tdvl8K54f048ZabSr2rqmPwxInaQd8adw/Iyt7LtZ4njj2bp//jqTr90PZI1PcKnoW37z1ZaNsm7b8HKoQ2Zd/+uylLs6G+mdq+bPFsXqi/8696/OrUE/U47KPQ8ri1A6xvbPn9lKu6qPu9nabtvxc2Ne+0/CS/N6UzsircVqD/JjTb9ry0m31X+F/lIkZ0d87J7l39s/ipOCckP+7OCn4HSB97+w0Hvn0fByXfY+FUvpOw4sJY58MTZrqu0ea/1M+nqZYhhl5y6Jn1JJdXz+2fGJ7Z3j4DOmLjzuyg/8eC9YB3J8V9vfOKXhPU9874/EJOEiI+0cfhzzE3g763tl1PdLmt+5am/4D97/p4O8dnnqKEz0vC8/84Oysjm/czGxhbOdpjPiR5hcIIWBHp31HHv2sucvTdOa1ten50uqvfRx+aJVVaPFsJ49v3Py8abt87ba0ev118269ab124+bnoR3WxNg7IYBv3Pz82jXrje2QQo6gdk3PdMm8ds3XIODQ2fkrPub1weTPuGKy7f9GufvfatffY4me+Iv9nhrE6My0/37TcxkbKx16sens9D2WNNF/8MFpjbMOY8ZMtfnxdDPirP3Yuv6qLrwnphcfMoujOcLtDbwR84rq4euYMVNQtg8+OAWN1sTM9BnWhc4pWBXRjacqVMkkfunyoNEcRkBryhOPGTMlk7rQ2fkrFapo55nYPE0J/vtNz91525/Z8LwsZz7XAHYfe1NuavWysg/NK1ilqmpAYZUI9lJa+nGYksJ8TDmAHceNzc2AXopCWGy/FokoNBN4ZiyIN+nipZOZ0AsqEApVrqmRDOAZ8EEEcPZM6KWNwUzJ/DHN+PlLA+mexQKE2xsuXx5Mt15BFsUiEbYmsqyMphXPFqRbRzqvcLXKsng1SAMQy1KLD1/sF+ZX5iGvqH7C2Gmp1Yu3VVChNMLOv7O5HFSUVOFDF0+YZsXZArbup1rHmK2usbms2ZWQlODDmvkyvPYlhHOaVBPHTU+JjoKtaGHhGpWoAT3fJkniIKvXLIiAm59J42dq8zFZfcFubDozu7K5HPVHt/jZC2z586wFednyiuonT5ilzz+3+qLd9OQG80Qt19FzRkf42Qt9HrcgD+H2hjPnj0Ni507fuL7X1Aglmim1ddc1Lm/Bl6o/Cx9CGI5/AaAFASnhEn8VcYGVwMEKwu0Np88fd60vbytFq3bE7OoOP3uhT34WP9z0BiH6X95YRgsCPNz0BtoF8ZeqP8u382DVbgTNjr3oU+50Z91TsldJGBytAAyKlsKvgjNiO9jO9XCmdjx1rjfZPRsUIBSirYNu8ZRoZWUdvl3eyxxBMrqzvmxuc/7oAj99vld+Lpuugy4ArMl7KL8yOPVWqBu40B3mMV1QvDbJ3PDUOWdG9CDkFdXnTMxzbYdYXFa4GO0I96BRXADmJ45019YBRU+2SXRfqT3K0/fR0vj1ALDpcK67Zsdk1gLomxIT8kmfkA8al1HTDDFJSMYOikK0/Cgal53i/UNdjqKKKQhJ38NNb9hEBpsMMRk4ORx2qnuMHuKLlmc6xk8MdydvQSMYtxxCLE45gBYDwz3u7BAN0tx+WR5PuTIAThOUlADYUV53PbkBu8WeP8AaCf4ogZ8YSpkbOnI0mwwxeegf6pLRXaChlQvuVFUSfe7MSmySePjM0XTM5exCXlH97EkFUGqUtIOqsnoiKytG1IhWX6TyeHa1TR9ouY4DOwQorols/rLXq7T3WqTw9KmRXXBqh2uqyp6xBLWfolSJ6gjPrqrpAHh4AOdBHNmEhRG0vSN87pRC/rzW9QH5U+ZHa4P6vJSxCbcmsuf30bVADr8+DAcADsFig5zuvK30hIYyH9Zsr70GJInPm1p0fTgjaFEwZb687rytguxZF7yIQVQXeKFmxxGU64C9UGB0grlTCrWT727swKo41+BMonZC2gVemFMsSMZPEPkHWJkEfgIV5hRrZxhVF7qD3YIKUVSq6ueYVOoOn8/kiJMMZkdAUToG2zJpHXvIK6ovnFoMx2i0XJo9vE9S94ASrSeCDwZZvu0e10zJ3tzQ+DBBr0WP0nsBMINJRkfTvni2E3IdOOeZStwjwQcsWJhTnA4dNXtF43Ka8MKp+qKZATBmC3lF9TCLi3NLo2er9diaKn3p8op7YVnV9s7wEkFa8I7BtnQH8byi+qKckvbBI/zdKsktTateASqsiVyMTjk+P6dEJhkyDfQygEtecW5JRCVM/mjMTbkuLH5wtqJ15fews51anNKqOunF0U2sXolCV3LktmDBopySdMtvyp+uqLhXJSR6PpFF08zgrQPv8/5VnFvKj9t2slU+wQQLlk5bAK+sZEZ+fiy6qvI+IW/ic6gs4kfk7AgWLMktxbwv8zJrz51VolJyLaLNc8/gJbkLgoqC0dZq+pdNL9PXvizKD/tllb3arO+dPYUvml6msuKKKuQu2O4F+WN7Z/jRY9g/ehBfOH0h/9zDU3Kyh/fsuTN7t48dsPNxF3bQz+KkZO+c8j1pknv5zMkD7wDF1kEfh9jgxA7amhjh1kHP44f6DkKCWTmzQl+7sy1z/HNn9sg1+gzae/j+/gPGonTlzIqsyxwMaO/2wZo4Snu3z5v4wf6DQqoIX/OK6kPMjtmUX7kaiYxS2AsxCqVexm1qEFmXn9nuo4g6WtEmtlfx/X0HrOoR4faGpt79WZb/hgANUPp/19TRCvUsnrAUll35g6MVGqDkaoR8cE0dF/QonhBGKTSL8iuXmQ+SGwL0BoV4Fl+WV2l1SiCvqH51fii78jNPvMx8UAlQEogwO3oTt4Gsy0wfqFt3NaJeVcm4IL2qEi/jm4+9Z8wT1xRUZV1m+qUV665EbTc+SL2PN3TtA6+szw9dVT0hM72v9gvjgspVVb0aIVdVNpd93Kkd2JqIcS3AxWgfh1xFxg4sT/RyXB4Rsul5opfjsvdlC/pzWXLO2szrIMyX8UHt/fuI6ln8t617ICh/rnSJ1+QMjg5Qj8+X195n5hPOtt5XsiTrOTbaTRmt0NEBCjHam7hwFAKs6SmZ9b3zaC5Gewrf0NJsLIKF2xs2tDR7R87Y3lnh9s7ewW3gBlYA5eZU9nB9TfRsjLYB78isjFa8NX8FedZXVJsefl1fUY15eNbnNVsTb4jGFm/i+LoTANjUUzKPgL3zX1TVXOXe7/hGqOZqRPXOXA5QQv/hkw9d0eqJ47V6oo+7sEPQOzEulrtmL866k8HfO6dg76x4J8Z5PE+wyQHi9s4jbh6NC3pC5lg90VPxjq87Pb27EZKb79TUytSZM08ThNpXgKuDeQr/aXMjX7/5+2W1WAfzjpysinP5mnpjUK/leArnLQi1nB807oL6jafkVECmS1fUm27Q7egd3HTj7EE5lXE30jGj6GiFXPhQ9RpuakQPyqmc+yAydgy96UZ6Y5B6DX+ytpavPuQV1T+1us6DctIXHvyTD6+QqROVD6+o2sdz+Hd37gSX/H5dnTflpK8/9NUPr5APr6hR+Xwc/MmBHYLjbqSjAmRUgAxfjEydqPi4CzsEhy8xHxwVJKOCxMfd2SE49kY6pPlgMEAf38LeMgZ4ek0JtgcDqo8HA5Z2oH/45vo//Z+Y7UzhuU+WysQc5CNJL8OTpzGVU2ash/877gV1Hn52e0nysZQWFMB/1ZWFVz67ABT7xtsJTE8IefbWkpTEK5mxEP71j0od0Scvp2Mjuobn7yrV7jmFwCeDr/9d4vuUWnj5Xt1F5OX88pvvZ86IhJAXP8NElPHNRxKtMOmDDZ9bIJnffCW6SmTUiAAv3F2q2RH8EWwah9//i5b02UgSYNWykfPTr8SEzIIRAX735bIr19QPP2LzevIEBfDP/8oyAmQeXr+fuSTKhvi9r4r3mD58zxdt5Dt74dKk8WPTqgAOYTrWI+vqYPR/26Bv/gRIuYQuGCqBAIXP0MVLiGPL1JvHWV0yEgt8kKEpZ+wOQwQCOsITowUJIfxwPA12F+Qx6mUUw9hl6KKlyjaGousfeIgQcmr4wtSbx7v2uCS7W8FX71+Gl174lf6QwAZQjDTJYwXBgMJqn9MmTbCTzhYGhy646D44dCHnEwluG/t50iiAnDaAYvCI1RAyoxsBewnd6TfWfcVeuHTAybPnc+Vu20P31aAAP//N7tc3biKEfH7trQmlshnCeEleHlNgP2/MfwaHLggt6fg6fcpESbaUuaP+AQsSQl7fuClhd6shBocuwCVeU2ML8JexhkYTb8QZU9kAJ8+eTyilIwIZhhvefsfIk/1yFH406OlkiyMSy3DmaUBBRYkh8PXk2fN4yaoFxTMwjDcifJ2Zc7Oi0IEziU2JNDbEA2fOA0Obz8CZ8+wn6zkaYLjht83sB1o1wKnU09nY09n4jz/7AYpq5MzLI4xulNlUQhuZDZcU2hE+c+L0OUGOE6fPzcqN09xIoygUaQRi5GbkA5c6wmf4EWfl3vzwp+94+XcbsREZgifesf6H/Hr05LeefPJbT9rcFewOA6HwKE9H+IyV8DyxzRB4if71175us0gfPzk8K/fmhKu4CzDl/OJbb9uzgrn8vUe/h2RGPtgiI3xb16ni/Kku5OdB6RsctjJ23+Bw3vRPyNwKnsaGIU9mylnGgoQQHMIoId8iI3zpvByj8G1dp/lG4auJQeZMn6RQenxgOPrPZeFfHrOPzSUjsdDLhsDmko0RwQcJIT98/PsgGEqIDI8PDLuTWRB+YWEOL+TCwhzBPkeOnYrXQvs2Z+YkqtDegSGjinApyY8pZ+DJX/r6/Z+yd8b2bf/7wF1LUZjWY4OI9w4MoRYoM0/Aq2AjD88QccEI48eO4rnFpThzZ012Onlt6HtPDMHV3hNDNpyFS5DEPPLgXYSQRx6865EH73rnRX0F7Nj2NuSMOGhZ0TTEkQ/PkCfgRQUalNBUCyuZTdVhNg33n23pGEja4eL8NX/WZGAISLj/LHxFRBju/Y6T2v+hYNDSMQD/pIe14CyPJowCH5TcyBlbgLlCY8QomFOtUS9ODA3Nnz2lvGQG8uvuP+uYdyJZ8mdPwbF4YhyL/ds8hfZ0Nv7kuz8qL5nR09kIZG9ufK+ns7Fzx+8xYbzvziXd/WeRIUqOLcgfW4A5VXRiHDR5TdkQT/7ln8PNP9Z7umD2FKfBXqYX0iQkPtZzwijA0LnLtVXzhPaPrjqVVAoSSmgK9Ht/pRsR4GBrf3npDGbT8OmLlz4C3AhIJg8uugDcc/ti01He+sNe+dGPhU8X5CVwEaQxIvYg7p1x71U4l6WgikIPHek3rruEkK7euC2HFSX07eo9A9yMvQTmh470CzRcCSIOt4ppQneQv3Du1IQxE2i6es8gsVUvHAKQ4LHw6cI5sZS9qmwWWh1xXO+NlwQwUgLM124JIp09p/hB97X0hRbORFZIDMBXFXlIOBaCFaUpCKPb0wCxMj8/xzQmdIZPQ3vVotlWQQNpALGhFDgIg+Kq3xk+bWRi5Yl337747tsXJwxoAkOUOWFHSYLOMNveiMT7Dx9XKC3Oj8vaTWMv0lgRA6uEnyXlsxVKO7tPCXw6u9nGwNKKkDNK8OdpTIeQZALyCB+Nodb23uFevIh+0dF9Spa9hRTACvnYMyyelysQQ0tcSZEvL2q4Iwl5NaEjDCHz6ejW5TESa8msls3iHV9SmQd48bwc3g3auwbhKyI2TgI0wAr5WDHk+QjEn1pThemhKWgEOgcbwd47FAY1ZYQ36tXeNSgIz9Po0bk6NEdR6HsHe21CWGlhLlxFBL62dw0ae8nTGLvzLfZuCFdxdGFQXirIDapDc4DGVGYZ3c1V3nMgDHe47eig5o8xaDs6aOUF/KXSwmnQ3YqYUjsa6I7QdnQwrsXO3aPeIAHVoblGmflBZTRFEGSmD959f03V3NaOgdL508zjuQQYu8swTNhr7aqQxOAMNm7Vfw8QQGb0JIEfgj3Nbe08uaBoutWtkAHo3tp5EoiRIbaYgjAo9tqzvydKL+OHQBMHyLl5X7eM/LzwRuD1wqu88Ert0vyy4mnaP8MQP62dA6btfGPzvm78inwAad7X7YgzEmvrF1l7S0jehGtvCZmKCqysPryCgqiml6xogvxTNAHKiqfb+3xLG6sX8Bxa2k4s5HpZMU/IGW64/egCmNJPmDDGnYIJJSQkRqPniTKJkpGmTCtP8O1lpbF6mnBJ6N7SPmDVMn7CGJYeOgQjQ6rEycMPZ0qc0AiWvf7lR0+AtIeO9C8qiavZYIvxkiMw8tnVfLR2qVjd4mH18kpHQwC8u2O/TK8k1TGCnmwfPsIqYHwCiS3GS8Zc9PCRfkpJY/MxuIQIfEXOgDQ2H+Nz+wTbOgexJcYK5LH6CJqayiz0NTLkW/Rku2LhTCHVxBbjJWNSCjRYRhPOMgj0cCcPHzlhldyuXuEgpPDqrl4RAp6mMjc2H7NJp1FmU8EEhoePnIhrsckADrb2C1eNLTxgri4k7QIQQiZMvKli4UzTodkQlj6U2C9tJEwoFchjJRgPIs2///TvZNYRezjQ0lfBFQSTgVXLKpLpTgjZ2sj+940AB1r6Lpy7vKJuPrbLyGxDs2NXByFkeS1jyGZh8p9Q2UyeycGWPiue9pduqa2UzI1t4JbaSuPoobKZq5bP59tlZBZo+O4A0ZYUwf6WPuQUWjTLiqv9JZlygynNPz37a77danQr2N/Sh4Jt39VpSsYriLknUOp5IqPQymqI2CRNpsRV5eYFcBuGwqWVyypdr4ZsvSP0x8/+GjgwVnJVQiDjhSeEGGXe39InKDjh5rG3rCyG7vp0Xlw+CzwTEfi6/9Bx49SwIjadwjYMhUsSYcPayPgsJkpjJbzVOoPthIiCGc0itNht+xi7itlJLvMCCAy3bG+7ZUUxIaSuOql48rePPgAD4V5xeQ1bXl0Iv3oVk8cRONj2vXfoOM6RbTva2UMFrsXR9DE+ivjnZ3/Fe+KPn/2lC8f8zqMPEhpj5UjCrTvaXKvD8sS9B3qtVly8tPdAr1br11sg5+JbeDAy5PkIqWXd0sq6pWyTx89V4aujtTLWNyqhDBACDzPotu1tQC9jFj2wKJRUh/IUSvYeCBvXC7wECBJz0V2nwb57D8SIsVHoju3fefTzelTVVI874254JiXbEmVVu7Qi4QrIL4WAo2oos5VZuPZoFKuummM6Jfcc6DVesqnQAPGeA7HHh6Zs9cYoCNsJ043UT579haRPxcikY/StqxcAsX3xychwz4Feu20fADOKAW5ds8BeH9NeAtQsqUDneuKxqEuCAwqOadNocFieVc2SCmHQLVtb+ZbmffojJkTsd4dGqK5iz/gSR30jTfO+HquOeImnadjSKtDXLK6wWemeePQLP3nmFwKBu4WyZnHcpOYXouZ9PcsWzwHBELltzQJeVBtNTaaz4KhN+8I2c2HZkrn8VSRu2hfGSzwNP0eWLq5curgycfA11svcVtB4UVESXlQXmmKXpn1hy+nMTCANQLx7b4/Q69133wce8XMkgQGfeuY14TwBhOcnHlvnLE5HB9q9F5986ZIYRZUEo1mWLZmrF2VNhdu9t9tKaNNLtUvn8vS793aj6yCypKpC1gfd+p2R/ze//hkU7Pbbynbv7QZRbRR0dLdMDjRBQNu9p6duab5VcLt84RLQ2ES/uqX5eO76jtvLFEqXhPTd8VPPbLBxR1j7nnjsjxO5rANNl4QqUVTQy15B6agORrAgr6vJt+FECNm1p9uehk8XqkIVVaFYLDYPvvyLkK6TROuOVKG79nSjUlbC8zRAbGxBJmAEk+m8q7kr4S1m9cia/IRkd9yxyPSoh30a8e2/+aLkCuUQEsu8q7nLqBe0oFl4+8Alk8CyvKYgoXBghZ1NUucLQpWcDzrJ+OT98amnX01IHKoUc0YA1GJnUzfobqoXmkWwz86mbss10X5RuPOOCoXSlcsKEq4doQqTfPDbj30pJevdT59+FfhIppChCia2wszUhcjKZQXvvHOIVwf0QhobHXc2se7sv6RZlX22Nx5bsazAUVGIh/JF5a77OgCsd8kVvkDflbX6U29EjHbASzYANEGboVfWet6CXAFRzoakorz84KGDRrtIdjeFBHvn7Y3HEq6PRigvl0gGE0YlGYJoLvn441+Wotd4lpeLiyMhbNq50BTg/wFS0vaQblDsVAAAAABJRU5ErkJggg==';
/* ---------- телефон: отдельная среда со своими приложениями (как телефон в GTA) ----------
   Экран — во всю высоту окна справа, без рамок и строки состояния. Всё внутри — в единицах em от ширины экрана,
   поэтому при любом размере окна раскладка одна и та же. Приложения регистрируются через PHONE.register и живут
   в своих окнах со стопкой страниц: «назад» снимает страницу, с первой страницы — на главный экран, с главного — закрыть телефон.
   Для будущих приложений есть готовые куски: страница со списком, переписка с кнопками ответа, страница сайта. */
{ const st = document.createElement('style'); st.textContent = `
#po{position:fixed;z-index:41;top:0;bottom:0;right:0;width:var(--pw,50vw);font-size:var(--pf,15px);overflow:hidden;
  transform:translateX(104%);transition:transform .42s cubic-bezier(.2,.9,.3,1);background:#0d1220;color:#eef1f6;
  box-shadow:-10px 0 28px rgba(0,0,0,.45);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#po.on{transform:none}
#po *{box-sizing:border-box}
#po canvas{position:static;left:auto;top:auto;transform:none;display:block;flex:none}
#po .po-home{position:absolute;inset:0;background:#141a2a var(--wall) center top/cover no-repeat;image-rendering:pixelated;transition:transform .3s,opacity .3s}
#po .po-home::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,11,20,.5),rgba(8,11,20,0) 24%,rgba(8,11,20,0) 75%,rgba(8,11,20,.4));pointer-events:none}
#po.inapp .po-home{transform:scale(.94);opacity:.4}
#po .po-grid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(4,1fr);gap:1.4em .4em;padding:3.2em 1.2em 0;image-rendering:auto}
#po .po-ic{display:flex;flex-direction:column;align-items:center;gap:.4em;min-width:0;background:none;border:0;padding:0;margin:0;color:#fff;cursor:pointer;font:inherit}
#po .po-ic canvas,#po .po-ic .po-gl{width:3.9em;height:3.9em;border-radius:23%;image-rendering:pixelated;box-shadow:0 .15em .4em rgba(0,0,0,.45);transition:transform .12s}
#po .po-ic:active canvas{transform:scale(.9)}
#po .po-ic b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;width:100%;font-size:.72em;font-weight:500;line-height:1.2;text-align:center;
  text-shadow:0 1px 2px rgba(0,0,0,.9);word-break:break-word}
#po .po-app{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;background:var(--bg,#10151f);color:var(--fg,#eef1f6);
  transform:scale(.2);opacity:0;transition:transform .32s cubic-bezier(.2,.9,.3,1),opacity .2s}
#po .po-app.on{transform:none;opacity:1}
#po .po-page{position:absolute;inset:0;display:flex;flex-direction:column;background:inherit;transition:transform .28s cubic-bezier(.2,.9,.3,1)}
#po .po-page.in{transform:translateX(100%)}
#po .po-page.under{transform:translateX(-25%)}
#po .po-top{flex:none;display:flex;align-items:center;gap:.3em;height:3.4em;padding:0 .6em;border-bottom:1px solid rgba(255,255,255,.08);background:var(--bar,rgba(255,255,255,.03))}
#po .po-back{flex:none;width:2.4em;height:2.4em;border:0;border-radius:50%;background:none;color:var(--acc,#ff5a7a);font:400 1.6em/1 inherit;cursor:pointer;padding:0 0 .12em}
#po .po-back:active{background:rgba(255,255,255,.08)}
#po .po-title{flex:1;min-width:0;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#po .po-body{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
#po .po-pad{padding:1em}
#po .po-btn{display:block;width:100%;border:0;border-radius:.8em;padding:.85em 1em;background:var(--acc,#ff5a7a);color:#fff;font:600 1em inherit;cursor:pointer}
#po .po-btn.ghost{background:rgba(255,255,255,.08);color:inherit}
#po .po-btn:active{filter:brightness(.9)}
#po .po-row{display:flex;align-items:center;gap:.8em;width:100%;padding:.75em 1em;border:0;border-bottom:1px solid rgba(255,255,255,.06);background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
#po .po-row:active{background:rgba(255,255,255,.05)}
#po .po-row i{flex:none;width:2.6em;height:2.6em;border-radius:50%;background:#2a3346 center/cover;font-style:normal;display:grid;place-items:center;font-weight:700}
#po .po-row span{flex:1;min-width:0}
#po .po-row small{display:block;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#po .po-chat{display:flex;flex-direction:column;gap:.4em;padding:1em .8em}
#po .po-msg{max-width:80%;padding:.55em .8em;border-radius:1.1em;line-height:1.3;white-space:pre-wrap;word-break:break-word;animation:po-pop .18s ease-out}
#po .po-msg.them{align-self:flex-start;background:#262e3e;border-bottom-left-radius:.3em}
#po .po-msg.me{align-self:flex-end;background:var(--acc,#ff5a7a);color:#fff;border-bottom-right-radius:.3em}
#po .po-msg.sys{align-self:center;background:none;opacity:.55;font-size:.8em}
#po .po-dots{display:inline-flex;gap:.25em}#po .po-dots i{width:.45em;height:.45em;border-radius:50%;background:currentColor;opacity:.5;animation:po-dot 1s infinite}
#po .po-dots i:nth-child(2){animation-delay:.15s}#po .po-dots i:nth-child(3){animation-delay:.3s}
#po .po-ans{flex:none;display:flex;flex-direction:column;gap:.4em;padding:.6em .8em .9em;border-top:1px solid rgba(255,255,255,.08)}
#po .po-ans:empty{display:none}
#po .po-ans button{border:1px solid var(--acc,#ff5a7a);border-radius:1.2em;padding:.6em .9em;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
#po .po-ans button:active{background:var(--acc,#ff5a7a);color:#fff}
#po .po-url{flex:1;min-width:0;padding:.45em .8em;border-radius:.7em;background:rgba(255,255,255,.08);font-size:.85em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.85}
@keyframes po-pop{from{transform:scale(.85);opacity:0}}
@keyframes po-dot{50%{opacity:1;transform:translateY(-.15em)}}
`; document.head.appendChild(st) }

const PHONE = window.__PHONE = (() => {
  const root = document.createElement('div'); root.id = 'po';
  root.style.setProperty('--wall', `url(${PH_WALL})`);
  root.innerHTML = '<div class="po-home"><div class="po-grid"></div></div>';
  document.body.appendChild(root);
  const grid = root.querySelector('.po-grid');
  ['click', 'pointerdown', 'touchstart', 'wheel', 'keydown', 'keyup'].forEach(t => root.addEventListener(t, e => e.stopPropagation(), { passive: true }));
  const apps = new Map(); let cur = null;            // cur = {app, el, pages:[{page, el}]}
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e };

  function layout() {                                // ширина экрана: как у телефона во всю высоту окна, но не больше 60% окна
    const vw = innerWidth, vh = innerHeight, pw = Math.round(Math.max(Math.min(vh * .4625, vw * .6), Math.min(vw, 240)));
    root.style.setProperty('--pw', pw + 'px'); root.style.setProperty('--pf', (pw / 23).toFixed(2) + 'px');
    return pw;
  }
  addEventListener('resize', layout); layout();

  function register(app) {                           // app: {id, name, icon: (ctx2d, size) => void, theme:{bg,fg,acc,bar}, start(ctx)}
    apps.set(app.id, app);
    const b = h('button', 'po-ic'); b.setAttribute('aria-label', app.name);
    const c = document.createElement('canvas'); c.width = c.height = 16; app.icon(c.getContext('2d'), 16);
    b.append(c, h('b', '', app.name)); b.onclick = () => { haptic('light'); open(app.id, b) };
    grid.appendChild(b); return app;
  }
  function open(id, from) {
    const app = apps.get(id); if (!app) return; if (cur) closeApp(true);
    const el = h('div', 'po-app'); const t = app.theme || {};
    for (const k in t) el.style.setProperty('--' + k, t[k]);
    if (from) { const r = from.getBoundingClientRect(), R = root.getBoundingClientRect(); el.style.transformOrigin = `${r.left + r.width / 2 - R.left}px ${r.top + r.height / 3 - R.top}px` }
    root.appendChild(el); cur = { app, el, pages: [] }; root.classList.add('inapp');
    const ctx = { app, os: PHONE, ui: UI, push, pop: back, home, el };
    app.start(ctx);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
  }
  function push(page) {                              // page: {title, render(body, page), onBack?() => true чтобы не уходить, top?(bar) — своя шапка, replace — заменить текущую}
    if (!cur) return;
    const el = h('div', 'po-page'), top = h('div', 'po-top'), body = h('div', 'po-body');
    const bk = h('button', 'po-back', '‹'); bk.setAttribute('aria-label', 'Назад'); bk.onclick = () => { haptic('light'); back() };
    top.append(bk); if (page.top) page.top(top); else top.append(h('div', 'po-title', page.title || cur.app.name));
    el.append(top, body); page.el = el; page.body = body;
    const prev = cur.pages[cur.pages.length - 1];
    if (prev) { el.classList.add('in'); requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.remove('in'); prev.el.classList.add('under') })) }
    cur.el.appendChild(el); cur.pages.push(page); page.render && page.render(body, page);
    if (page.replace && prev) { cur.pages.splice(cur.pages.length - 2, 1); prev.gone = true; setTimeout(() => prev.el.remove(), 300) }   // страница вместо предыдущей: «назад» на неё не вернёт
    return page;
  }
  function back() {                                  // назад: страница → главный экран → закрыть телефон
    if (!cur) { closePhone(); return }
    const p = cur.pages[cur.pages.length - 1];
    if (p && p.onBack && p.onBack()) return;
    if (cur.pages.length > 1) {
      cur.pages.pop(); const q = cur.pages[cur.pages.length - 1];
      p.el.classList.add('in'); q.el.classList.remove('under'); setTimeout(() => p.el.remove(), 300); p.gone = true; return;
    }
    closeApp();
  }
  function closeApp(now) {
    if (!cur) return; const { el, pages } = cur; pages.forEach(p => p.gone = true); cur = null; root.classList.remove('inapp');
    if (now) { el.remove(); return }
    el.classList.remove('on'); setTimeout(() => el.remove(), 330);
  }
  function home() { closeApp() }
  function reset() { closeApp(true) }                // телефон закрыли — в следующий раз откроется главный экран

  /* готовые куски для приложений */
  const UI = {
    h,
    btn(text, on, ghost) { const b = h('button', 'po-btn' + (ghost ? ' ghost' : ''), text); b.onclick = () => { haptic('light'); on && on() }; return b },
    row({ title, sub, avatar, on }) {                // строка списка: аватар, заголовок, подпись
      const b = h('button', 'po-row'), i = h('i'); if (avatar && /^(data:|https?:|blob:)/.test(avatar)) i.style.backgroundImage = `url(${avatar})`; else i.textContent = avatar || (title || '?')[0];
      const s = h('span'); s.append(h('div', '', title)); if (sub) s.append(h('small', '', sub));
      b.append(i, s); b.onclick = () => { haptic('light'); on && on() }; return b;
    },
    /* переписка: chat.say('them'|'me'|'sys', текст), await chat.typing(мс), const n = await chat.ask(['вариант 1', 'вариант 2']) → номер выбранного */
    chat(page) {
      const log = h('div', 'po-chat'), ans = h('div', 'po-ans'); page.body.append(log); page.el.append(ans);
      const down = () => page.body.scrollTop = page.body.scrollHeight;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      return {
        say(who, text) { const m = h('div', 'po-msg ' + who, text); log.append(m); down(); if (who === 'them') haptic('light'); return m },
        async typing(ms = 900) { if (page.gone) return; const m = h('div', 'po-msg them'); m.innerHTML = '<span class="po-dots"><i></i><i></i><i></i></span>'; log.append(m); down(); await wait(ms); m.remove() },
        ask(opts) {
          ans.textContent = '';
          return new Promise(res => opts.forEach((o, n) => { const b = h('button', '', o); b.onclick = () => { haptic('light'); ans.textContent = ''; this.say('me', o); res(n) }; ans.append(b) }));
        },
        clear() { log.textContent = ''; ans.textContent = '' },
      };
    },
    /* страница сайта: шапка с адресом вместо заголовка */
    site(url, render) { return push({ top: bar => bar.append(h('div', 'po-url', url)), render }) },
  };

  return { root, layout, register, open, push, back, home, reset, apps, ui: UI, get app() { return cur && cur.app.id } };
})();
/* клавиатура при открытом телефоне: игра её не получает; Esc — «назад» */
addEventListener('keydown', e => {
  if (!PH.on) return;
  if (e.code === 'Escape') { e.preventDefault(); PHONE.back() }
  if (!PHONE.root.contains(e.target)) e.stopImmediatePropagation();
}, true);
addEventListener('keyup', e => { if (PH.on && !PHONE.root.contains(e.target)) e.stopImmediatePropagation() }, true);

/* ---------- Кудзуя-сан: просьбы-задания по СМС ----------
   сосед Кирью стоит у своего стола на левой стенке участка и по одной присылает просьбы: что найти в земле и положить ему на стол.
   положил то, что нужно, — он забирает вещь, платит монетами и через пару секунд пишет следующую просьбу.
   прогресс — в сохранении игры (GAME.q): i — номер просьбы, s — уже прислана, a — выбранные ответы, seen — до какой просьбы переписка уже прочитана, nw — непрочитано */
const QUESTS = [
  { type: 'coffee', what: 'банка кофе', acc: 'банку кофе', pay: 5, got: 'О-о, кофе! Аригато, Кирью-кун!',
    say: ['Кирью-кун, здравствуй! Это Кудзуя, твой сосед.', 'Старик у большого стола слева от твоей ямы — это я. Помаши мне.', 'Раз уж ты копаешь — найди мне банку кофе. Положи её на мой стол, я заплачу.'],
    ask: [{ t: 'Хорошо, Кудзуя-сан!' }, { t: 'А откуда у вас мой номер?', re: ['Ты сам мне его дал. Лет двадцать назад. Ты тогда был вот такой.', 'Кофе, Кирью-кун. Кофе.'] }] },
  { type: 'tin', what: 'консервная банка', acc: 'пустую консервную банку', pay: 3, got: 'Отличная банка. Спасибо!',
    say: ['Спасибо за кофе! Теперь хоть глаза открываются.', 'Теперь нужна пустая консервная банка. Посажу в неё дайкон.'],
    ask: [{ t: 'Будет сделано' }, { t: 'Дайкон? В банке?', re: ['Маленький дайкон. Не задавай лишних вопросов, Кирью-кун.'] }] },
  { type: 'wormTin', what: 'банка с червями', acc: 'банку с червями', pay: 7, got: 'Какие жирные! Рыба будет счастлива.',
    say: ['Дайкон уже проклюнулся.', 'В субботу иду на рыбалку. Набери мне банку червей: лопаткой разрыхли гнездо на стенке ямы и подставь пустую банку.'],
    ask: [{ t: 'Черви так черви' }, { t: 'А сами никак?', re: ['У меня спина, Кирью-кун. Ты видел, как я стою?'] }] },
  { type: 'glass', what: 'зелёная бутылка', acc: 'зелёную бутылку', pay: 4, got: 'Какой цвет! Будет мне фонарик в сад.',
    say: ['Рыбы я не поймал, но черви были прекрасные.', 'Найди зелёную бутылку. Сделаю из неё фонарик для сада.'],
    ask: [{ t: 'Поищу' }] },
  { type: 'skull', what: 'череп Егора Филатова', acc: 'череп Егора Филатова', pay: 12, got: 'Он самый... Поставлю рядом с пластинками.',
    say: ['Говорят, у тебя в земле лежит Егор Филатов.', 'Я его очень уважаю. Принеси череп — поставлю на полку рядом с его пластинками.'],
    ask: [{ t: 'Это вообще законно?', re: ['Он бы не возражал.'] }, { t: 'Принесу' }] },
  { type: null, say: ['Спасибо тебе за всё, Кирью-кун. Пока мне больше ничего не нужно.', 'Будет дело — напишу.'], idle: 'Отдыхай, Кирью-кун. Будет дело — напишу.' },
];
const Q = (() => { const q = GAME.q; if (!q || typeof q.i !== 'number') return { i: 0, s: 0, a: [], seen: -1, nw: false };
  return { i: Math.max(0, Math.min(QUESTS.length - 1, q.i | 0)), s: q.s ? 1 : 0, a: Array.isArray(q.a) ? q.a.slice(0, QUESTS.length) : [], seen: typeof q.seen === 'number' ? q.seen : -1, nw: !!q.nw } })();
const cap = s => s[0].toUpperCase() + s.slice(1);

/* ---------- приложение «Сообщения»: СМС от Кудзуя-сан и с неизвестного номера ----------
   Неизвестный номер — сюжетная переписка по сценарию из редактора диалогов (DT_SCRIPTS): появляется, когда Кирью начинает
   копать второй слой (телефон дважды вибрирует). Пока сценарий отрабатывается, она каждый запуск начинается заново */
{ const st = document.createElement('style'); st.textContent = `
#po .po-row i{image-rendering:pixelated}
#po .dt-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6em;padding:2em;text-align:center;opacity:.75}
#po .dt-empty .big{font-size:2.6em;opacity:.9}
#po .dt-new{display:inline-block;vertical-align:middle;width:.55em;height:.55em;border-radius:50%;background:var(--acc);margin-left:.4em}
#po .po-row.dt-fresh small{color:var(--acc);opacity:1;font-weight:600}
#po .po-ic{position:relative}
#po .po-ic sup{position:absolute;top:-.3em;right:.9em;min-width:1.4em;padding:0 .35em;border-radius:1em;background:#ff3b5c;color:#fff;font:700 .7em/1.4em inherit;box-shadow:0 0 0 .15em rgba(0,0,0,.35)}
.tool .ph-dot{position:absolute;top:2px;right:2px;width:11px;height:11px;border-radius:50%;background:#ff3b5c;box-shadow:0 0 0 2px #2a1a10;animation:ph-dot 1s ease-in-out infinite;pointer-events:none}
@keyframes ph-dot{50%{transform:scale(1.25)}}
`; document.head.appendChild(st) }
const DT_PEOPLE = { stranger: { id: 'stranger', name: 'Розовые', hair: 'long', bg: ['#ffc2dc', '#a8406f'] } };
/* сценарии переписки — их собирает редактор диалогов («Скопировать для игры»).
   узел: {say:[реплики собеседника], ask:[{t:текст ответа, to:следующий узел}]}; без ask или с пустым to — пока конец */
const DT_SCRIPTS = {
  stranger: { start: 'n1', nodes: {
    n1: { say: ['Кирью, значит...'], ask: [
      { t: 'Кто это?', to: '' },
      { t: 'а?', to: '' },
      { t: 'Имя не имеет значения, у меня есть своя земля', to: '' } ] },
  } },
};

/* пиксельный портрет-силуэт: фон-градиент с дизерингом, волосы, голова и плечи, подсветка контура */
function dtPortrait(g) {
  const W = 32, H = 48, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const t = tmp.getContext('2d', { willReadFrequently: true });
  const lab = new Uint8Array(W * H);
  const layer = (val, draw, maxY = H) => { t.clearRect(0, 0, W, H); t.fillStyle = '#000'; t.beginPath(); draw(t); t.fill(); const d = t.getImageData(0, 0, W, H).data; for (let i = 0; i < W * maxY; i++) if (d[i * 4 + 3] > 110) lab[i] = val };
  const el = (q, cx, cy, rx, ry) => { q.moveTo(cx + rx, cy); q.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2) };
  const back = { long: q => { el(q, 16, 19, 7.3, 7.7); q.rect(8.7, 19, 14.6, 16); el(q, 16, 35, 7.3, 2.6) }, bob: q => { el(q, 16, 19, 7.6, 7.6); q.rect(8.4, 19, 15.2, 7.5) },
    pony: q => { el(q, 16, 19, 6.5, 7.3); el(q, 23.4, 24.5, 2.5, 6.8) }, bun: q => { el(q, 16, 19, 6.3, 7.1); el(q, 16, 10.6, 3.4, 3.2) } }[g.hair];
  layer(1, back);
  layer(2, q => { el(q, 16, 52, 15, 15); q.rect(13.8, 24, 4.4, 8); el(q, 16, 20.5, 5.3, 6.6) });
  layer(1, q => el(q, g.hair === 'bob' ? 15 : 16.5, 15.6, 5.9, 3.8), 17);
  const hex = s => [1, 3, 5].map(k => parseInt(s.slice(k, k + 2), 16)), c1 = hex(g.bg[0]), c2 = hex(g.bg[1]);
  const BY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], img = x.createImageData(W, H);
  const nb = (i, j) => i < 0 || j < 0 || i >= W || j >= H ? 0 : lab[j * W + i];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, v = lab[k]; let col;
    if (!v) { const q = Math.round(Math.min(1, Math.max(0, j / H + (BY[j % 4][i % 4] / 16 - .5) / 8)) * 7) / 7; col = c1.map((a, n) => a + (c2[n] - a) * q) }
    else {
      col = v === 1 ? [18, 12, 26] : [52, 40, 70];
      if (!nb(i + 1, j - 1) || !nb(i + 1, j) || v === 2 && nb(i + 1, j) === 1) col = col.map((a, n) => a + (c1[n] - a) * (v === 1 ? .45 : .6));
    }
    img.data.set([col[0], col[1], col[2], 255], k * 4);
  }
  x.putImageData(img, 0, 0); return c;
}

/* аватар Кудзуя-сан: лысина, седые виски, огромные круглые очки, клетчатый воротник */
function kzAvatar() {
  const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'), R = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h) };
  R('#e7c07a', 0, 0, 16, 16); R('#d4a861', 0, 10, 16, 6);
  R('#a8352d', 2, 13, 12, 3); R('#4c1614', 4, 13, 1, 3); R('#4c1614', 11, 13, 1, 3); R('#cfa870', 7, 13, 2, 3);
  R('#dcab84', 4, 3, 8, 10); R('#dcab84', 5, 2, 6, 1); R('#f0c7a2', 6, 3, 3, 1);
  R('#dedbd4', 3, 5, 1, 4); R('#dedbd4', 12, 5, 1, 4);
  for (const ox of [3, 8]) { R('#231a15', ox, 6, 5, 1); R('#231a15', ox, 9, 5, 1); R('#231a15', ox, 7, 1, 2); R('#231a15', ox + 4, 7, 1, 2); R('#c6dde4', ox + 1, 7, 3, 2); R('#1c120c', ox + 2, 7, 1, 2) }
  R('#dedbd4', 6, 11, 4, 1); R('#9c5c4a', 7, 12, 2, 1);
  return c.toDataURL();
}
const SMS = PHONE.register({
  id: 'sms', name: 'Сообщения',
  theme: { bg: '#0f1519', acc: '#2fbd63', bar: 'rgba(47,189,99,.07)' },
  icon(x) {                                          // белое облачко сообщения на зелёном
    for (let y = 0; y < 16; y++) for (let i = 0; i < 16; i++) { const t = (i + y) / 30; x.fillStyle = `rgb(${70 - t * 30 | 0},${215 - t * 60 | 0},${110 - t * 40 | 0})`; x.fillRect(i, y, 1, 1) }
    const H = ["................", "................", "................", "....WWWWWWWW....", "..WWWWWWWWWWWW..", ".WWWWWWWWWWWWWW.", ".WWWWWWWWWWWWWW.", ".WWWWWWWWWWWWWW.", ".WWWWWWWWWWWWWW.", "..WWWWWWWWWWWW..", "...WWWWWWWWWW...", "...WWW..........", "..WW............", "................", "................", "................"];
    H.forEach((r, y) => [...r].forEach((ch, i) => { if (ch === 'W') { x.fillStyle = '#f4fff7'; x.fillRect(i, y, 1, 1) } }));
  },
  m: {},                                             // переписки с неизвестных номеров: {c:[номера ответов], nw}
  unread() { return (Q.nw ? 1 : 0) + Object.values(this.m).filter(m => m.nw).length },
  badge() {                                          // счётчик на значке приложения и точка на кнопке телефона
    const n = this.unread(), ic = PHONE.root.querySelector('.po-ic'); if (!ic) return;
    let s = ic.querySelector('sup'); if (n && !s) { s = document.createElement('sup'); ic.append(s) } if (s) { if (n) s.textContent = n; else s.remove() }
    const tb = toolBtns[TOOLS.indexOf('phone')]; if (!tb) return;
    let dot = tb.querySelector('.ph-dot');
    if (n && !dot) { if (getComputedStyle(tb).position === 'static') tb.style.position = 'relative'; dot = document.createElement('span'); dot.className = 'ph-dot'; tb.append(dot) }
    if (!n && dot) dot.remove();
  },
  buzz() {                                           // телефон дважды вибрирует
    const one = () => { try { if (tg && tg.HapticFeedback) { tg.HapticFeedback.notificationOccurred('success'); setTimeout(() => tg.HapticFeedback.impactOccurred('heavy'), 140) } else if (navigator.vibrate) navigator.vibrate([180, 90, 180]) } catch (_) { }
      if (iconFx.phone) iconFx.phone.shake = 1 };
    one(); setTimeout(one, 900);
  },
  refresh() { if (this.page && this.page.refresh && !this.page.gone) this.page.refresh() },
  unlock(id) {                                       // новый собеседник с неизвестного номера
    if (this.m[id]) return;
    this.m[id] = { c: [], nw: true }; this.badge(); this.buzz(); this.refresh();
    toast('СМС от ' + (DT_PEOPLE[id] ? DT_PEOPLE[id].name : 'незнакомки') + '…', 2);
  },
  start(ctx) { this.main(ctx) },

  main(ctx) {
    const app = this, u = ctx.ui;
    app.page = ctx.push({ title: this.name, render(body, page) {
      const show = () => {
        body.textContent = '';
        const rows = [];
        if (Q.s || Q.i > 0) rows.push({ title: 'Кудзуя-сан', sub: Q.nw ? 'Новое сообщение' : app.kzLast(), avatar: kzAvatar(), nw: Q.nw, on: () => app.kzChat(ctx, page) });
        for (const id of Object.keys(app.m)) { const g = DT_PEOPLE[id]; if (!g) continue; const m = app.m[id];
          rows.push({ title: g.name, sub: m.nw ? 'Новое сообщение' : app.lastLine(id) || '…', avatar: dtPortrait(g).toDataURL(), nw: m.nw, on: () => app.chat(ctx, g, page) }) }
        if (!rows.length) { const e = u.h('div', 'dt-empty'); e.append(u.h('div', 'big', '💬'), u.h('div', '', 'Сообщений пока нет.')); body.append(e); return }
        for (const r of rows) { const b = u.row(r); if (r.nw) { b.classList.add('dt-fresh'); b.querySelector('span div').append(u.h('b', 'dt-new')) } body.append(b) }
      };
      page.refresh = () => { app.badge(); show() };
      page.badge = () => app.badge();
      show();
    } });
  },

  /* переписка с Кудзуя-сан собирается из прогресса просьб: прочитанное — сразу, новое — с «печатает…» */
  kzLast() {
    const last = Q.s ? Q.i : Q.i - 1, q = QUESTS[last]; if (!q) return '';
    const a = q.ask && q.ask[Q.a[last]]; if (a) return a.re ? a.re[a.re.length - 1] : 'Вы: ' + a.t;
    return q.say[q.say.length - 1];
  },
  kzChat(ctx, parent) {
    const app = this; Q.nw = false; app.badge();
    const page = ctx.push({ title: 'Кудзуя-сан', render() { }, onBack() { parent.refresh && parent.refresh(); return false } });
    const chat = ctx.ui.chat(page);
    (async () => {
      const last = Q.s ? Q.i : Q.i - 1;
      for (let i = 0; i <= last && !page.gone; i++) {
        const q = QUESTS[i], live = i > Q.seen && i === last;   // пропущенные старые просьбы — сразу, печатается только последняя
        for (const t of q.say) { if (live) await chat.typing(Math.min(1700, 450 + t.length * 24)); if (page.gone) return; chat.say('them', t) }
        if (i > Q.seen) Q.seen = i;
        if (!q.ask) continue;
        let n = Q.a[i], now = false;
        if (n == null || !q.ask[n]) { if (i !== last) continue; n = await chat.ask(q.ask.map(a => a.t)); if (page.gone) return; Q.a[i] = n; now = true }
        else chat.say('me', q.ask[n].t);
        for (const t of q.ask[n].re || []) { if (now) await chat.typing(Math.min(1700, 450 + t.length * 24)); if (page.gone) return; chat.say('them', t) }
      }
    })();
  },

  /* последняя реплика в переписке с неизвестным номером — для подписи в списке */
  lastLine(id) {
    const S = DT_SCRIPTS[id], m = this.m[id]; if (!S || !m) return '';
    let n = S.nodes[S.start], last = '';
    for (let k = 0; n; k++) {
      if (n.say && n.say.length) last = n.say[n.say.length - 1];
      const a = (n.ask || []).filter(a => a && a.t)[m.c[k]]; if (!a) break;
      last = 'Вы: ' + a.t; n = S.nodes[a.to];
    }
    return last;
  },
  /* переписка по сценарию: уже выбранные ответы проигрываются сразу, новые реплики — с «печатает…» */
  chat(ctx, g, parent) {
    const app = this, m = app.m[g.id], S = DT_SCRIPTS[g.id]; if (!m || !S) return;
    m.nw = false; app.badge();
    const page = ctx.push({ title: g.name, render() { }, onBack() { parent.refresh && parent.refresh(); return false } });
    const chat = ctx.ui.chat(page);
    (async () => {
      let id = S.start, k = 0;
      while (!page.gone) {
        const n = S.nodes[id]; if (!n) break;
        const live = k >= m.c.length;
        for (const t of n.say || []) { if (live) await chat.typing(Math.min(1800, 500 + t.length * 28)); if (page.gone) return; chat.say('them', t) }
        const ask = (n.ask || []).filter(a => a && a.t);
        if (!ask.length) break;                          // конец написанного сценария
        let i = k < m.c.length ? m.c[k] : -1;
        if (i >= 0 && ask[i]) chat.say('me', ask[i].t);
        else { m.c.length = k; i = await chat.ask(ask.map(a => a.t)); m.c.push(i) }
        id = ask[i].to; k++;
        if (!id || !S.nodes[id]) break;
      }
    })();
  },
});
SMS.badge();

function openPhone() {
  if (PH.on) return closePhone();
  if (CH.state !== 'walk' || CH.held) { shakeTool('phone'); toast(CH.held ? 'Руки заняты' : 'Не сейчас'); return }
  PH.on = true; PH.turn = true; PHONE.layout(); haptic('medium'); document.body.classList.add('phon'); phTap.style.display = 'block';
}
function closePhone() { if (!PH.on) return; PH.on = false; PH.turn = false; PHONE.root.classList.remove('on'); setTimeout(() => { if (!PH.on) PHONE.reset() }, 450); phTap.style.display = 'none'; document.body.classList.remove('phon'); haptic('light') }
/* ракурс крупного плана всегда один и тот же (слева спереди, чуть снизу). Всё, что оказалось между камерой и Кирью
   (стенки ямы, блоки, невидимые стены), просто срезается ближней плоскостью камеры — видно только Кирью и то, что за ним */
const phDir = (ang, el, fw, sd) => fw.clone().multiplyScalar(Math.cos(ang)).addScaledVector(sd, -Math.sin(ang)).multiplyScalar(Math.cos(el)).addScaledVector(_UP, -Math.sin(el)).normalize();
const PH_CLIP = .5;                                           // насколько перед точкой у лица начинается видимое
const ease3 = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const _hp = new THREE.Vector3(), _UP = new THREE.Vector3(0, 1, 0);
function stepPhone(dt) {
  if (PH.on && PH.turn) {                                      // сначала разворот к зрителю, камера ждёт
    CH.face.copy(PH_FACE);
    let dy = PH_YAW - CH.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    if (Math.abs(dy) < .06) PH.turn = false;
  }
  PH.k = Math.max(0, Math.min(1, PH.k + (PH.on && !PH.turn ? dt / .85 : PH.on ? 0 : -dt / .5)));
  if (PH.on && PH.k > .8 && !PHONE.root.classList.contains('on')) PHONE.root.classList.add('on');   // камера почти у лица — выезжает экран
  if (PH.k <= 0) { VCAM = cam; return }
  const e = ease3(PH.k), yaw = CH.yaw;
  KIRYU.head.localToWorld(_hp.set(0, .1, .1));
  const fw = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), sd = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const d1 = phDir(PHT.ang, PHT.el, fw, sd);
  const d0 = VIEW.clone(), dir = d0.lerp(d1, e).normalize();
  const t0 = cam.position.clone().addScaledVector(VIEW, -60);
  const right = new THREE.Vector3().crossVectors(_UP, d1).normalize();
  const asp = W / H, fr = Math.min(.8, PHONE.root.offsetWidth / Math.max(1, innerWidth));   // доля окна под экран телефона
  const vhT = Math.max(PHT.vh, .45 / (asp * (1 - fr))), shT = vhT * asp * fr / 2;   // лицо — посередине свободной слева части
  const t1 = _hp.clone().addScaledVector(right, shT).add(new THREE.Vector3(0, -PHT.fy * 10, 0));
  const tgt = t0.lerp(t1, e);
  const h0 = cam.top - cam.bottom, h1 = vhT, vh = h0 * Math.pow(h1 / h0, e), fov = 2 + (PHT.fov - 2) * e;
  const dist = vh / 2 / Math.tan(fov * Math.PI / 360), c = PH.cam;
  c.fov = fov; c.aspect = W / H; c.near = Math.max(.03, dist - (40 + (PH_CLIP - 40) * e)); c.far = dist + 120; c.updateProjectionMatrix();
  c.position.copy(tgt).addScaledVector(dir, dist); c.lookAt(tgt); c.updateMatrixWorld();
  VCAM = c;
}
function stepChar(dt) {
  let ix = joy.x, iy = joy.y;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iy -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) iy += 1;
  const dir = SCR_R.clone().multiplyScalar(ix).addScaledVector(G_UP, -iy); dir.y = 0;
  if (PH.on) dir.set(0, 0, 0);                                // телефон открыт — стоит на месте
  const m = Math.min(1, dir.length()); if (m > 0) dir.normalize(); CH.spd = m;
  if (CH.state === 'bag') { stepBag(dt, ix, iy); chP.position.set(CH.x, CH.y + .72, CH.z); chP.velocity.set(0, 0, 0); return }   // мешок: подходит, расстилает, сидит над ним
  if (CH.state === 'ladder') { stepLadder(dt, PH.on ? 0 : iy); chP.position.set(CH.x, CH.y + .72, CH.z); chP.velocity.set(0, 0, 0); return }
  const fl0 = groundAt(CH.x, CH.z, CH.y), fl = fl0 === null ? CH.y : fl0;   // яма, верх стенок, лестница, дом
  const p0x = CH.x, p0z = CH.z, p0y = CH.y;
  CH.moving = false;
  if (CH.state === 'jump') {
    const A = CH.anim; A.t += dt / A.dur; const k = Math.min(1, A.t);
    if (A.kind === 'climb') {                                  // сначала подтягиваемся на месте, потом шагаем на край
      const k1 = Math.min(1, k / .65), k2 = Math.max(0, (k - .65) / .35);
      CH.y = A.y0 + (A.y1 + .02 - A.y0) * Math.sin(k1 * Math.PI / 2); CH.x = A.x0 + (A.x1 - A.x0) * k2; CH.z = A.z0 + (A.z1 - A.z0) * k2;
    } else { CH.x = A.x0 + (A.x1 - A.x0) * k; CH.z = A.z0 + (A.z1 - A.z0) * k; CH.y = A.y0 + (A.y1 - A.y0) * k * k + .16 * Math.sin(Math.PI * k) }
    if (k >= 1) { CH.y = A.y1; CH.state = 'walk'; CH.land = .14; haptic(A.kind === 'down' ? 'medium' : 'light') }
  } else if (CH.y > fl + .005 && !(CH.state !== 'fall' && CH.y - fl < STEP_UP)) {   // по лестнице вниз идём, а не падаем                               // под ногами выкопали блок — падаем
    CH.state = 'fall'; CH.vy -= 22 * dt; CH.y = Math.max(fl, CH.y + CH.vy * dt);
    if (CH.y <= fl) { if (CH.vy < -4) haptic('medium'); CH.vy = 0; CH.land = .16; CH.state = 'walk' }
  } else {
    CH.y = fl; CH.vy = 0; if (CH.state === 'fall') CH.state = 'walk';
    if (m < .15) { if (CH.state !== 'walk') CH.state = 'walk'; CH.t = 0 }
    else {
      CH.face.copy(dir);
      const step = SPEED * m * dt * (CH.held ? (TYPES[CH.held.type].mass > 1 ? .65 : .85) : 1); let blocked = null, push = null;
      for (const ax of ['x', 'z']) {                           // по осям отдельно — вдоль стенки можно скользить
        const dv = dir[ax] * step; if (Math.abs(dv) < 1e-6) continue;
        const nx = ax === 'x' ? CH.x + dv : CH.x, nz = ax === 'z' ? CH.z + dv : CH.z, px = ax === 'x' ? nx + Math.sign(dv) * R : nx, pz = ax === 'z' ? nz + Math.sign(dv) * R : nz;
        const h = groundAt(px, pz, fl);
        if (h === null || kitHit(px, pz, fl)) { if (Math.abs(dir[ax]) > .55) push = new THREE.Vector3(ax === 'x' ? Math.sign(dv) : 0, 0, ax === 'z' ? Math.sign(dv) : 0); continue }   // край мира, высокая стенка, стеллаж, ящик
        if (Math.abs(h - fl) < STEP_UP) {
          const HT = CH.held; if (holdBlocks(HT)) { if (!holdFreeAt(HT, nx, h, nz, CH.yaw)) CH.upAsk = .3;   // впереди вещь не пройдёт — поднять над головой
            if (!carryMoveOk(HT, CH.x, fl, CH.z, CH.yaw, nx, h, nz, CH.yaw)) continue }   // вещь в руках упёрлась — стоим
          CH.x = nx; CH.z = nz; CH.moving = true }
        else if (Math.abs(dir[ax]) > .55) blocked = { h, ad: new THREE.Vector3(ax === 'x' ? Math.sign(dv) : 0, 0, ax === 'z' ? Math.sign(dv) : 0) };
      }
      const pad = blocked ? blocked.ad : push, lc = pad && ladFrom(pad);                  // упёрлись в лестницу (снизу) или в край над ней (сверху) — лезем
      if (lc) { CH.lt = (CH.lt || 0) + dt; if (CH.lt > .2 && !CH.lmsg) { CH.lmsg = true; if (tryLadder(lc.s, lc.k, lc.from)) return } } else { CH.lt = 0; CH.lmsg = false }
      const kind = !lc && blocked && fl < .05 && blocked.h < .05 ? (blocked.h < fl ? 'edge' : blocked.h - fl < BH + .05 ? 'wall' : null) : null;   // прыгать и залезать — только в яме и на верх стенок
      if (kind) {
        if (CH.state !== kind) { CH.state = kind; CH.t = 0 }
        CH.t += dt; CH.face.copy(blocked.ad);
        if (CH.t > (kind === 'edge' ? .55 : .6)) {              // всё ещё держим джойстик к краю — прыгаем
          const ad = blocked.ad, x1 = CH.x + ad.x * (2 * R + .2), z1 = CH.z + ad.z * (2 * R + .2);
          CH.anim = { kind: kind === 'edge' ? 'down' : 'climb', t: 0, dur: kind === 'edge' ? .35 + .07 * Math.min(4, (fl - blocked.h) / BH) : .62, x0: CH.x, z0: CH.z, y0: CH.y, x1, z1, y1: blocked.h };
          CH.state = 'jump';
        }
      } else if (CH.state !== 'walk') { CH.state = 'walk'; CH.t = 0 }
    }
  }
  chP.position.set(CH.x, CH.y + .72, CH.z);                    // толкаем мусор телом
  chP.velocity.set((CH.x - p0x) / Math.max(dt, 1e-3), (CH.y - p0y) / Math.max(dt, 1e-3), (CH.z - p0z) / Math.max(dt, 1e-3));
}
const lerp = (a, b, k) => a + (b - a) * k;
function drawChar(dt, now) {
  chG.position.set(CH.x, CH.state === 'ladder' ? CH.yd : CH.y, CH.z);
  let dy = Math.atan2(CH.face.x, CH.face.z) - CH.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); let st = dy * Math.min(1, dt * 10);
  const HT = CH.held;                                           // с вещью в руках не разворачивается сквозь стенку: поворачивает, насколько пускает
  if (holdBlocks(HT) && CH.state === 'walk' && Math.abs(st) > 1e-4) { let ok = false;
    if (!holdFreeAt(HT, CH.x, CH.y, CH.z, CH.yaw + st)) CH.upAsk = .3;
    for (const f of [1, .5, .25, .1]) if (carryMoveOk(HT, CH.x, CH.y, CH.z, CH.yaw, CH.x, CH.y, CH.z, CH.yaw + st * f)) { st *= f; ok = true; break }
    if (!ok) st = 0 }
  CH.yaw += st; chG.rotation.y = CH.yaw; if (CH.held) carryPose(CH.held, dt);   // вещь — за телом в этом же кадре, руки — на неё
  CH.swing = Math.max(0, CH.swing - dt); CH.land = Math.max(0, CH.land - dt);
  KIRYU.update(dt, { state: CH.state === 'bag' ? 'walk' : CH.state, moving: CH.moving, bag: bagPoseNow(), bagBack: BAG.back ? bagFill() / 6 : null, speed: CH.spd || 0, anim: CH.anim, swing: CH.swing, land: CH.land, carry: !!CH.held, grip: CH.held && CH.grip && CH.state !== 'ladder' && CH.state !== 'jump' && CH.state !== 'fall' ? CH.grip : null, lad: CH.state === 'ladder' ? CH.lad.pose : null, sideLad: CH.state === 'ladder' && !!CH.lad.carry, phone: PH.k > 0 ? Math.min(1, PH.k * 1.7) ** 2 * (3 - 2 * Math.min(1, PH.k * 1.7)) : 0 });
}

