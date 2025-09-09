define([], function () {
  return class Settings {
    constructor(widget) {
      this.widget = widget;
    }

    /**
     * Saves the settings from the form.
     * @param {Object} evt - The event object containing the active status and custom fields.
     * @returns {Promise} - A promise that resolves with the saved settings data or an indication to reinstall.
     */
    save(evt) {
      let _this = this;
      let code = _this.widget.params.widget_code;
      let isActive = false;
      let formData = $("#" + _this.widget.config.prefix + "-settings__form").serializeJSON() || {};
      let params = formData.params || {};
      
      console.log("Form data:", formData);
      console.log("Extracted params:", params);

      return new Promise(function (resolve, reject) {
        // Determine if the widget is active
        isActive = evt.active === "Y";

        let data = {
          is_active: isActive,
        };

        // Check if already installed
        let installed = ((_this.widget.params || {}).active || "N") === "Y";
        
<<<<<<< HEAD
<<<<<<< HEAD
        // Only validate if widget is being activated AND has configuration data
        if (isActive && installed) {
          console.log("Validating params for configured widget:", params);
=======
        if (isActive) {
          console.log("Validating params:", params);
>>>>>>> 1b9ae0d (Assistant checkpoint: Fix form serialization and custom field handling)
=======
        // Only validate if widget is being activated AND has configuration data
        if (isActive && installed) {
          console.log("Validating params for configured widget:", params);
>>>>>>> 39d8944 (Assistant checkpoint: Fix validation during widget installation)
          
          // Only validate if we have actual configuration data
          if (params && Object.keys(params).length > 0) {
            if (!_this.widget.validateSettings(params)) {
              console.log("Validation failed for params:", params);
              
              // Trigger save error if validation fails
              $(".modal." + code)
                .find(".js-widget-save")
                .trigger("button:save:error");

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 39d8944 (Assistant checkpoint: Fix validation during widget installation)
              // Reject the promise due to validation error
              reject(new Error("Validation failed"));
              return;
            } else {
              console.log("Validation passed, saving configuration...");
            }
<<<<<<< HEAD
=======
            // Reject the promise due to validation error
            reject(new Error("Validation failed"));
            return;
          } else {
            console.log("Validation passed, saving configuration...");
            // Add parameters to data after successful validation
            data.params = params;
            
            // Update widget info with new settings
            _this.widget.info = data;
            
            // CRITICAL: Set the custom field with serialized params
            evt.fields.custom = JSON.stringify(params);
            
            resolve(data);
            return;
>>>>>>> 1b9ae0d (Assistant checkpoint: Fix form serialization and custom field handling)
=======
>>>>>>> 39d8944 (Assistant checkpoint: Fix validation during widget installation)
          }
          
          // Add parameters to data after successful validation
          data.params = params;
          
          // Update widget info with new settings
          _this.widget.info = data;
          
          // CRITICAL: Set the custom field with serialized params
          evt.fields.custom = JSON.stringify(params);
          
          resolve(data);
          return;
        }

<<<<<<< HEAD
<<<<<<< HEAD
        // For inactive widgets or installation, just set custom field without validation
=======
        // For inactive widgets, still need to set custom field
>>>>>>> 1b9ae0d (Assistant checkpoint: Fix form serialization and custom field handling)
=======
        // For inactive widgets or installation, just set custom field without validation
>>>>>>> 39d8944 (Assistant checkpoint: Fix validation during widget installation)
        evt.fields.custom = JSON.stringify(params);
        
        // Update widget info with new settings
        _this.widget.info = data;
        resolve(data);
      }).then(function (result) {
        console.log("Settings saved successfully:", result);
        return true;
      }).catch(function (error) {
        console.error("Error saving settings:", error);
        throw error;
      });
    }

    /**
     * Loads the settings from the widget.
     * @returns {Promise} - A promise that resolves with an empty array after loading settings.
     */
    load() {
      let _this = this;
      return new Promise((resolve, reject) => {
        // Initialize settings with custom parameters or an empty object
        _this.widget.info.params = (_this.widget.params || {}).custom || {};
        if (typeof _this.widget.info.params === "string") {
          _this.widget.info.params = JSON.parse(_this.widget.info.params);
        }
        // Default templates to empty string if not defined
        if (!_this.widget.info.params.templates) {
          _this.widget.info.params.templates = "";
        }
        resolve([]);
      });
    }
  };
});
