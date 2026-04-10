cmake_minimum_required(VERSION 3.10)
project(chelly-exec)

add_library(chelly-exec SHARED src/main/jni/chelly-exec.c)
target_link_libraries(chelly-exec log)
