# Fastlane integration

Drop a `zh_lint` lane into your `Fastfile`:

```ruby
lane :zh_lint do
  sh("npx --yes zh-lint@latest #{File.expand_path('..', __dir__)} --format=plain")
end
```

Call it from your release lane before `build_app`:

```ruby
lane :release do
  zh_lint
  build_app(scheme: "ClockWidgetX")
  upload_to_app_store
end
```

`zh-lint` exits non-zero on violations, which makes the `sh` action fail the lane.
