using System;
using System.Collections.Generic;

namespace SS_CAM.Models
{
    public class CategoryPreset
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Suffix { get; set; }
        public List<string> Folders { get; set; }
        public bool IsDefault { get; set; }

        public CategoryPreset()
        {
            Folders = new List<string>();
            IsDefault = false;
        }

        public string DisplayName
        {
            get
            {
                return string.Format("[{0}] {1}", Suffix ?? "D", Name);
            }
        }
    }
}
