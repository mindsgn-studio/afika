Pod::Spec.new do |s|
  s.name           = 'PocketModule'
  s.version        = '1.0.0'
  s.summary        = 'A sample project summary'
  s.description    = 'A sample project description'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
  }
  s.source = { :path => '.' }
  s.static_framework = true
  s.source_files = [
    'PocketModule.swift'
  ]
  s.vendored_frameworks = 'PocketCore.xcframework'  
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'CLANG_ENABLE_MODULES' => 'YES'
  }
  
  s.dependency 'ExpoModulesCore'
end
