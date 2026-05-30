#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <React/RCTBridgeModule.h>

@interface IconSwitcher : NSObject <RCTBridgeModule>
@end

@implementation IconSwitcher

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (NSString *)alternateIconNameForKey:(NSString *)iconKey
{
  if ([iconKey isEqualToString:@"teal"]) {
    return @"AppIconTeal";
  }
  if ([iconKey isEqualToString:@"midnight"]) {
    return @"AppIconMidnight";
  }
  return nil;
}

- (NSString *)keyForAlternateIconName:(NSString *)alternateIconName
{
  if ([alternateIconName isEqualToString:@"AppIconTeal"]) {
    return @"teal";
  }
  if ([alternateIconName isEqualToString:@"AppIconMidnight"]) {
    return @"midnight";
  }
  return @"default";
}

RCT_REMAP_METHOD(setIconName,
                 setIconName:(NSString *)iconKey
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIApplication *application = [UIApplication sharedApplication];
    if (![application supportsAlternateIcons]) {
      reject(@"ICON_SWITCH_UNSUPPORTED", @"This device does not support alternate app icons", nil);
      return;
    }

    NSString *nextIconName = [self alternateIconNameForKey:iconKey];
    [application setAlternateIconName:nextIconName completionHandler:^(NSError * _Nullable error) {
      if (error) {
        reject(@"ICON_SWITCH_FAILED", error.localizedDescription, error);
        return;
      }
      resolve(iconKey ?: @"default");
    }];
  });
}

RCT_REMAP_METHOD(getIconName,
                 getIconNameWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSString *alternateIconName = [UIApplication sharedApplication].alternateIconName;
    resolve([self keyForAlternateIconName:alternateIconName]);
  });
}

@end
