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
        public int SlaDays { get; set; }
        public double SlotWeight { get; set; }

        public CategoryPreset()
        {
            Folders = new List<string>();
            IsDefault = false;
            SlaDays = 3;
            SlotWeight = 1.0;
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
