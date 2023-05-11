FROM python:3@sha256:b9683fa80e22970150741c974f45bf1d25856bd76443ea561df4e6fc00c2bc17

WORKDIR /novnc
RUN pip install numpy
RUN git clone --branch v1.2.0 https://github.com/novnc/noVNC.git .
RUN git clone https://github.com/novnc/websockify ./utils/websockify
RUN sed -i 's/$(hostname):${PORT}\/vnc.html?host=$(hostname)&port=${PORT}/host.docker.internal:${PORT}/g' ./utils/launch.sh
RUN cp vnc.html index.html

CMD utils/launch.sh --vnc selenium:5900


