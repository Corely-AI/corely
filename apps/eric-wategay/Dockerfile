FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY apps/eric-wategay/ ./apps/eric-wategay/
RUN dotnet restore ./apps/eric-wategay/EricWategay.slnx
RUN dotnet publish ./apps/eric-wategay/src/EricWategay.Api/EricWategay.Api.csproj \
    -c Release \
    -r linux-x64 \
    --self-contained false \
    /p:UseAppHost=false \
    -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://0.0.0.0:8088
ENV ERIC_WORKDIR=/tmp/eric

COPY --from=build /app/publish/ ./

EXPOSE 8088
ENTRYPOINT ["dotnet", "EricWategay.Api.dll"]
